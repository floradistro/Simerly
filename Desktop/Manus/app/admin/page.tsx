'use client'

// Admin interface - optimized for mobile and desktop
// Environment variables configured - should work now
import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { Product } from '../../lib/supabase'
import { PricingRule, BasePricing } from '../api/pricing/route'
import LayoutConfigPanel from './components/LayoutConfigPanel'
import DisplayControlsPanel from './components/DisplayControlsPanel'

interface MenuSettings {
  display_config?: {
    font_size: number
    theme: string
    auto_refresh_interval: number
    display_effects: boolean
  }
  flipboard_messages?: {
    [key: string]: string[]
  }
}

export default function AdminPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [settings, setSettings] = useState<MenuSettings>({})
  const [pricingRules, setPricingRules] = useState<PricingRule[]>([])
  const [basePricing, setBasePricing] = useState<BasePricing[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'flower' | 'vapes' | 'edibles' | 'pricing' | 'specials' | 'bundles' | 'display' | 'layout-flower' | 'layout-vapes' | 'layout-edibles'>('flower')
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set())
  const [selectedPricingRules, setSelectedPricingRules] = useState<Set<string>>(new Set())
  const [selectedBasePricing, setSelectedBasePricing] = useState<Set<string>>(new Set())
  const [selectedSpecials, setSelectedSpecials] = useState<Set<string>>(new Set())
  const [selectedBundles, setSelectedBundles] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [showSearchInput, setShowSearchInput] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [saving, setSaving] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showBulkActions, setShowBulkActions] = useState(false)

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'a' && activeTab !== 'pricing') {
        e.preventDefault()
        selectAll()
      }
      if (e.key === 'Escape') {
        setSelectedProducts(new Set())
        setEditingProduct(null)
        setShowAddModal(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [activeTab])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [productsResponse, settingsResponse, pricingResponse] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/menu-settings'),
        fetch('/api/pricing')
      ])
      
      if (!productsResponse.ok || !settingsResponse.ok || !pricingResponse.ok) {
        throw new Error('Failed to fetch data')
      }

      const productsData = await productsResponse.json()
      const settingsData = await settingsResponse.json()
      const pricingData = await pricingResponse.json()
      
      console.log('Fetched settings data:', settingsData)
      
      setProducts(productsData.products || [])
      setSettings(settingsData.settings || {})
      setPricingRules(pricingData.pricing_rules || [])
      setBasePricing(pricingData.base_pricing || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filtered products based on search
  const filteredProducts = useMemo(() => {
    const categoryProducts = products.filter(p => p.category === activeTab)
    
    if (!searchQuery) return categoryProducts
    
    return categoryProducts.filter(product => 
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.effects?.some(e => e.toLowerCase().includes(searchQuery.toLowerCase()))
    )
  }, [products, activeTab, searchQuery])

  const selectAll = useCallback(() => {
    const allIds = new Set(filteredProducts.map(p => p.id))
    setSelectedProducts(allIds)
  }, [filteredProducts])

  const toggleProductSelection = useCallback((productId: string) => {
    const newSelection = new Set(selectedProducts)
    if (newSelection.has(productId)) {
      newSelection.delete(productId)
    } else {
      newSelection.add(productId)
    }
    setSelectedProducts(newSelection)
  }, [selectedProducts])

  const handleBulkAction = async (action: string, data?: any) => {
    const productIds = Array.from(selectedProducts)
    
    try {
      setSaving(true)
      const response = await fetch('/api/products/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, productIds, ...data })
      })

      if (!response.ok) throw new Error('Bulk action failed')
      
      await fetchData()
      setSelectedProducts(new Set())
    } catch (err) {
      alert('Error performing bulk action: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const updateProduct = async (product: Product, updates: Partial<Product>) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...product, ...updates })
      })

      if (!response.ok) {
        throw new Error('Failed to update product')
      }

      await fetchData()
      setEditingProduct(null)
    } catch (err) {
      alert('Error updating product: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const deleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return

    try {
      setSaving(true)
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Failed to delete product')
      }

      await fetchData()
    } catch (err) {
      alert('Error deleting product: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const addProduct = async (newProduct: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setSaving(true)
      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newProduct)
      })

      if (!response.ok) {
        throw new Error('Failed to add product')
      }

      await fetchData()
      setShowAddModal(false)
    } catch (err) {
      alert('Error adding product: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const getProductsByCategory = (category: string) => {
    return products.filter(p => p.category === category)
  }

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col bg-neutral-600 relative overflow-hidden" style={{ fontSize: '12.8px' }}>
        {/* Light Grid Background */}
        <div 
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px'
          }}
        ></div>
        
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-400 mx-auto mb-4"></div>
            <div className="text-2xl text-white font-apple-semibold drop-shadow-lg">Loading admin panel...</div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen w-screen flex flex-col bg-neutral-600 relative overflow-hidden" style={{ fontSize: '12.8px' }}>
        {/* Light Grid Background */}
        <div 
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.15) 1px, transparent 1px)
            `,
            backgroundSize: '30px 30px'
          }}
        ></div>
        
        <div className="absolute inset-0 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="text-2xl text-red-400 mb-4 font-apple-semibold drop-shadow-lg">Error: {error}</div>
            <button 
              onClick={fetchData}
              className="px-6 py-3 bg-emerald-600/80 hover:bg-emerald-600 backdrop-blur-xl rounded-xl transition-all duration-200 text-white font-apple-medium border border-emerald-400/30"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-neutral-600 relative overflow-hidden" style={{ fontSize: '12.8px' }}>
      {/* Light Grid Background */}
      <div 
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255, 255, 255, 0.15) 1px, transparent 1px)
          `,
          backgroundSize: '30px 30px'
        }}
      ></div>

      {/* Luxury Background Effects */}
      <div className="absolute inset-0 pointer-events-none z-10">
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent"></div>
      </div>
      
      {/* Combined Header & Navigation */}
      <header className="bg-black/40 backdrop-blur-xl border-b border-white/20 sticky top-0 z-40">
        <div className="w-full px-6 py-4">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0">
            <div className="flex flex-col sm:flex-row sm:items-center space-y-4 sm:space-y-0 sm:space-x-8">
              <h1 className="font-don-graffiti text-white tracking-[0.2em] drop-shadow-2xl text-xl sm:text-2xl">
                ADMIN
              </h1>
              
              {/* Navigation Tabs */}
              <div className="flex flex-wrap gap-2 sm:gap-4 lg:gap-6">
                {[
                  { key: 'flower', label: 'FLOWER', count: getProductsByCategory('flower').length },
                  { key: 'vapes', label: 'VAPES', count: getProductsByCategory('vapes').length },
                  { key: 'edibles', label: 'EDIBLES', count: getProductsByCategory('edibles').length },
                  { key: 'pricing', label: 'PRICING', count: pricingRules.length },
                  { key: 'specials', label: 'SPECIALS', count: null },
                  { key: 'bundles', label: 'BUNDLES', count: null },
                  { key: 'display', label: 'DISPLAY', count: null },
                  { key: 'layout-flower', label: 'LAYOUT: FLOWER', count: null },
                  { key: 'layout-vapes', label: 'LAYOUT: VAPES', count: null },
                  { key: 'layout-edibles', label: 'LAYOUT: EDIBLES', count: null }
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => {
                      setActiveTab(tab.key as any)
                      setSelectedProducts(new Set())
                      setSelectedPricingRules(new Set())
                      setSelectedBasePricing(new Set())
                      setSelectedSpecials(new Set())
                      setSelectedBundles(new Set())
                    }}
                    className={`font-apple-medium transition-all duration-200 flex items-center space-x-1 hover:text-white text-xs sm:text-sm whitespace-nowrap ${
                      activeTab === tab.key
                        ? 'text-emerald-400'
                        : 'text-white/70'
                    }`}
                  >
                    <span>{tab.label}</span>
                    {tab.count !== null && (
                      <span className="text-xs">
                        ({tab.count})
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {showSearchInput ? (
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search products..."
                    className="px-3 py-2 bg-white/10 backdrop-blur-xl rounded-lg text-white placeholder-white/60 text-sm border border-white/20 focus:border-emerald-400/50 focus:outline-none transition-all duration-200 w-48 sm:w-64"
                    autoFocus
                  />
                  <button
                    onClick={() => {
                      setShowSearchInput(false)
                      setSearchQuery('')
                    }}
                    className="p-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-lg transition-all duration-200 text-white/70 hover:text-white border border-white/20"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowSearchInput(true)}
                  className="p-2 transition-all duration-200 text-white/70 hover:text-white"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              )}

              {(selectedProducts.size > 0 || selectedPricingRules.size > 0 || selectedBasePricing.size > 0 || selectedSpecials.size > 0 || selectedBundles.size > 0) && (
                <button
                  onClick={() => setShowBulkActions(!showBulkActions)}
                  className="px-3 py-2 bg-emerald-600/80 hover:bg-emerald-600 backdrop-blur-xl rounded-lg text-sm transition-all duration-200 text-white font-apple-medium border border-emerald-400/30"
                >
                  Bulk Actions ({selectedProducts.size + selectedPricingRules.size + selectedBasePricing.size + selectedSpecials.size + selectedBundles.size})
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Bulk Actions Bar */}
      {showBulkActions && (selectedProducts.size > 0 || selectedPricingRules.size > 0 || selectedBasePricing.size > 0 || selectedSpecials.size > 0 || selectedBundles.size > 0) && (
        <div className="bg-emerald-600/90 backdrop-blur-xl text-white px-6 py-4 sticky top-16 z-20 border-b border-emerald-400/30">
          <div className="w-full flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="font-apple-semibold">
                {selectedProducts.size + selectedPricingRules.size + selectedBasePricing.size + selectedSpecials.size + selectedBundles.size} items selected
              </span>
              <button
                onClick={() => {
                  setSelectedProducts(new Set())
                  setSelectedPricingRules(new Set())
                  setSelectedBasePricing(new Set())
                  setSelectedSpecials(new Set())
                  setSelectedBundles(new Set())
                }}
                className="text-sm hover:underline font-apple-medium"
              >
                Clear selection
              </button>
            </div>
            <div className="flex items-center space-x-3">
              {selectedProducts.size > 0 && (
                <>
                  <button
                    onClick={() => handleBulkAction('update', { updates: { in_stock: true } })}
                    className="px-4 py-2 bg-green-500/80 hover:bg-green-500 backdrop-blur-xl rounded-xl transition-all duration-200 font-apple-medium border border-green-400/30"
                  >
                    Mark In Stock
                  </button>
                  <button
                    onClick={() => handleBulkAction('update', { updates: { in_stock: false } })}
                    className="px-4 py-2 bg-orange-500/80 hover:bg-orange-500 backdrop-blur-xl rounded-xl transition-all duration-200 font-apple-medium border border-orange-400/30"
                  >
                    Mark Out of Stock
                  </button>
                  <button
                    onClick={() => handleBulkAction('clone')}
                    className="px-4 py-2 bg-purple-500/80 hover:bg-purple-500 backdrop-blur-xl rounded-xl transition-all duration-200 font-apple-medium border border-purple-400/30"
                  >
                    Clone
                  </button>
                </>
              )}
              <button
                onClick={() => {
                  const totalSelected = selectedProducts.size + selectedPricingRules.size + selectedBasePricing.size + selectedSpecials.size + selectedBundles.size
                  if (confirm(`Delete ${totalSelected} items?`)) {
                    if (selectedProducts.size > 0) handleBulkAction('delete')
                    // Add bulk delete handlers for other types here
                  }
                }}
                className="px-4 py-2 bg-red-500/80 hover:bg-red-500 backdrop-blur-xl rounded-xl transition-all duration-200 font-apple-medium border border-red-400/30"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 relative z-20 overflow-y-auto">
        <div className="w-full px-6 py-8">
          {(activeTab === 'flower' || activeTab === 'vapes' || activeTab === 'edibles') && (
            <ProductManagement
              category={activeTab}
              products={filteredProducts}
              selectedProducts={selectedProducts}
              onToggleSelection={toggleProductSelection}
              onSelectAll={selectAll}
              editingProduct={editingProduct}
              setEditingProduct={setEditingProduct}
              onUpdate={updateProduct}
              onDelete={deleteProduct}
              onAdd={addProduct}
              onRefresh={fetchData}
              saving={saving}
              showAddModal={showAddModal}
              setShowAddModal={setShowAddModal}
            />
          )}

          {activeTab === 'pricing' && (
            <PricingPanel
              pricingRules={pricingRules}
              basePricing={basePricing}
              products={products}
              onRefresh={fetchData}
              saving={saving}
              setSaving={setSaving}
              selectedPricingRules={selectedPricingRules}
              selectedBasePricing={selectedBasePricing}
              onTogglePricingRuleSelection={(id: string) => {
                const newSelection = new Set(selectedPricingRules)
                if (newSelection.has(id)) {
                  newSelection.delete(id)
                } else {
                  newSelection.add(id)
                }
                setSelectedPricingRules(newSelection)
              }}
              onToggleBasePricingSelection={(id: string) => {
                const newSelection = new Set(selectedBasePricing)
                if (newSelection.has(id)) {
                  newSelection.delete(id)
                } else {
                  newSelection.add(id)
                }
                setSelectedBasePricing(newSelection)
              }}
              onSelectAllPricingRules={() => {
                setSelectedPricingRules(new Set(pricingRules.map(r => r.id)))
              }}
              onSelectAllBasePricing={() => {
                setSelectedBasePricing(new Set(basePricing.map(p => p.id!)))
              }}
            />
          )}

          {activeTab === 'specials' && (
            <SpecialsPanel
              products={products}
              onRefresh={fetchData}
              saving={saving}
              setSaving={setSaving}
              selectedSpecials={selectedSpecials}
              onToggleSpecialSelection={(id: string) => {
                const newSelection = new Set(selectedSpecials)
                if (newSelection.has(id)) {
                  newSelection.delete(id)
                } else {
                  newSelection.add(id)
                }
                setSelectedSpecials(newSelection)
              }}
              onSelectAllSpecials={(specialIds: string[]) => {
                setSelectedSpecials(new Set(specialIds))
              }}
            />
          )}

          {activeTab === 'bundles' && (
            <BundlesPanel
              products={products}
              onRefresh={fetchData}
              saving={saving}
              setSaving={setSaving}
              selectedBundles={selectedBundles}
              onToggleBundleSelection={(id: string) => {
                const newSelection = new Set(selectedBundles)
                if (newSelection.has(id)) {
                  newSelection.delete(id)
                } else {
                  newSelection.add(id)
                }
                setSelectedBundles(newSelection)
              }}
              onSelectAllBundles={(bundleIds: string[]) => {
                setSelectedBundles(new Set(bundleIds))
              }}
            />
          )}



          {activeTab === 'display' && (
            <DisplayControlsPanel onRefresh={fetchData} />
          )}

          {activeTab === 'layout-flower' && (
            <LayoutConfigPanel page="flower" />
          )}

          {activeTab === 'layout-vapes' && (
            <LayoutConfigPanel page="vapes" />
          )}

          {activeTab === 'layout-edibles' && (
            <LayoutConfigPanel page="edibles" />
          )}
        </div>
      </main>
    </div>
  )
}

// Product Management Component
function ProductManagement({
  category,
  products,
  selectedProducts,
  onToggleSelection,
  onSelectAll,
  editingProduct,
  setEditingProduct,
  onUpdate,
  onDelete,
  onAdd,
  onRefresh,
  saving,
  showAddModal,
  setShowAddModal
}: {
  category: string
  products: Product[]
  selectedProducts: Set<string>
  onToggleSelection: (productId: string) => void
  onSelectAll: () => void
  editingProduct: Product | null
  setEditingProduct: (product: Product | null) => void
  onUpdate: (product: Product, updates: Partial<Product>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  onAdd: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onRefresh: () => Promise<void>
  saving: boolean
  showAddModal: boolean
  setShowAddModal: (show: boolean) => void
}) {
  const getTypesByCategory = (cat: string) => {
    switch (cat) {
      case 'flower': return ['indica', 'sativa', 'hybrid']
      case 'vapes': return ['indica', 'sativa', 'hybrid']
      case 'edibles': return ['cookie', 'gummy', 'moonwater']
      default: return []
    }
  }

  const getProductsByType = (type: string) => {
    return products.filter(p => p.type.toLowerCase() === type.toLowerCase())
  }

  const allTypes = getTypesByCategory(category)

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white/5 backdrop-blur-md rounded-xl border border-white/20">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-don-graffiti text-white capitalize tracking-wide drop-shadow-lg" style={{ textShadow: '0 4px 8px rgba(0, 0, 0, 0.7)' }}>{category}</h2>
          <div className="flex items-center space-x-4">
            <button
              onClick={onRefresh}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-lg transition-all duration-200 flex items-center space-x-2 text-white font-apple-medium border border-white/20"
              disabled={saving}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
            <button
              onClick={onSelectAll}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-xl text-sm transition-all duration-200 text-white font-apple-medium border border-white/20"
            >
              Select All
            </button>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-6 py-3 bg-emerald-600/80 hover:bg-emerald-600 backdrop-blur-xl rounded-xl transition-all duration-200 flex items-center space-x-2 text-white font-apple-medium border border-emerald-400/30"
              disabled={saving}
            >
              <span>+</span>
              <span>Add</span>
            </button>
          </div>
        </div>
      </div>

      {/* Show all types, even empty ones */}
      {allTypes.map(type => (
        <TypeSection
          key={type}
          type={type}
          products={getProductsByType(type)}
          category={category}
          selectedProducts={selectedProducts}
          onToggleSelection={onToggleSelection}
          onUpdate={onUpdate}
          onDelete={onDelete}
          editingProduct={editingProduct}
          setEditingProduct={setEditingProduct}
          saving={saving}
        />
      ))}

      {/* Add Product Modal */}
      {showAddModal && (
        <AddProductModal
          category={category}
          onAdd={onAdd}
          onClose={() => setShowAddModal(false)}
          saving={saving}
        />
      )}
    </div>
  )
}

// Type Section Component (same as before but organized better)
function TypeSection({
  type,
  products,
  category,
  selectedProducts,
  onToggleSelection,
  onUpdate,
  onDelete,
  editingProduct,
  setEditingProduct,
  saving
}: {
  type: string
  products: Product[]
  category: string
  selectedProducts: Set<string>
  onToggleSelection: (productId: string) => void
  onUpdate: (product: Product, updates: Partial<Product>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  editingProduct: Product | null
  setEditingProduct: (product: Product | null) => void
  saving: boolean
}) {
  const getTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'indica': return 'text-purple-400'
      case 'sativa': return 'text-orange-400'
      case 'hybrid': return 'text-emerald-400'
      case 'cookie': return 'text-amber-400'
      case 'gummy': return 'text-pink-400'
      case 'moonwater': return 'text-cyan-400'
      default: return 'text-white'
    }
  }

  const getTypeBorder = (type: string) => {
    switch (type.toLowerCase()) {
      case 'indica': return 'border-purple-400/30'
      case 'sativa': return 'border-orange-400/30'
      case 'hybrid': return 'border-emerald-400/30'
      case 'cookie': return 'border-amber-400/30'
      case 'gummy': return 'border-pink-400/30'
      case 'moonwater': return 'border-cyan-400/30'
      default: return 'border-white/20'
    }
  }

  return (
    <div className={`bg-white/5 backdrop-blur-md rounded-xl border ${getTypeBorder(type)} overflow-hidden`}>
      <div className="flex items-center justify-between p-6 border-b border-white/10">
        <h3 className={`text-2xl font-apple-bold ${getTypeColor(type)} capitalize tracking-wide drop-shadow-lg`} style={{ textShadow: '0 4px 8px rgba(0, 0, 0, 0.7)' }}>{type}</h3>
        <span className="text-sm text-white/70 font-apple-medium">{products.length} items</span>
      </div>

      {products.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-white/5 border-b border-white/10">
              <tr>
                <th className="text-left py-4 px-6 text-sm font-apple-semibold text-white/80 w-12"></th>
                <th className="text-left py-4 px-6 text-sm font-apple-semibold text-white/80 min-w-[200px]">Name</th>
                <th className="text-left py-4 px-6 text-sm font-apple-semibold text-white/80 min-w-[100px]">Price</th>
                {(category === 'flower' || category === 'vapes') && (
                  <>
                    <th className="text-left py-4 px-6 text-sm font-apple-semibold text-white/80 min-w-[80px]">THCA</th>
                    <th className="text-left py-4 px-6 text-sm font-apple-semibold text-white/80 min-w-[120px]">Terpenes</th>
                  </>
                )}
                {category === 'edibles' && (
                  <th className="text-left py-4 px-6 text-sm font-apple-semibold text-white/80 min-w-[100px]">Dosage</th>
                )}
                <th className="text-left py-4 px-6 text-sm font-apple-semibold text-white/80 min-w-[100px]">Status</th>
                <th className="text-right py-4 px-6 text-sm font-apple-semibold text-white/80 min-w-[140px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product, index) => (
                <ProductRow
                  key={product.id}
                  product={product}
                  category={category}
                  isSelected={selectedProducts.has(product.id)}
                  onToggleSelection={() => onToggleSelection(product.id)}
                  onUpdate={onUpdate}
                  onDelete={onDelete}
                  isEditing={editingProduct?.id === product.id}
                  setEditing={setEditingProduct}
                  saving={saving}
                  isEven={index % 2 === 0}
                />
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center text-white/60 py-12">
          <div className="text-lg font-apple-semibold mb-2">No {type} products found</div>
          <div className="text-sm font-apple-medium">Click "Add" to add the first one.</div>
        </div>
      )}
    </div>
  )
}

// Enhanced Product Row for table layout
function ProductRow({
  product,
  category,
  isSelected,
  onToggleSelection,
  onUpdate,
  onDelete,
  isEditing,
  setEditing,
  saving,
  isEven
}: {
  product: Product
  category: string
  isSelected: boolean
  onToggleSelection: () => void
  onUpdate: (product: Product, updates: Partial<Product>) => Promise<void>
  onDelete: (id: string) => Promise<void>
  isEditing: boolean
  setEditing: (product: Product | null) => void
  saving: boolean
  isEven: boolean
}) {
  const [editForm, setEditForm] = useState({
    name: product.name,
    price: product.price,
    thca: product.thca || '',
    dosage: product.dosage || '',
    terpenes: product.terpenes ? product.terpenes.join(', ') : '',
  })

  const handleSave = () => {
    const updates = {
      name: editForm.name,
      price: editForm.price,
      thca: editForm.thca || null,
      dosage: editForm.dosage || null,
      terpenes: editForm.terpenes ? editForm.terpenes.split(',').map(t => t.trim()) : [],
    }
    onUpdate(product, updates)
  }

  const handleCancel = () => {
    setEditForm({
      name: product.name,
      price: product.price,
      thca: product.thca || '',
      dosage: product.dosage || '',
      terpenes: product.terpenes ? product.terpenes.join(', ') : '',
    })
    setEditing(null)
  }

  const handleRowClick = (e: React.MouseEvent) => {
    // Don't trigger selection if clicking on buttons, inputs, or other interactive elements
    if ((e.target as HTMLElement).tagName === 'BUTTON' || 
        (e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).closest('button') ||
        (e.target as HTMLElement).closest('input')) {
      return
    }
    onToggleSelection()
  }

  if (isEditing) {
    return (
      <tr className={`${isEven ? 'bg-white/5' : ''} border-b border-white/5`}>
        <td className="py-4 px-6">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelection}
            className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
          />
        </td>
        <td className="py-4 px-6">
          <input
            type="text"
            value={editForm.name}
            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
            className="w-full px-3 py-2 bg-white/10 backdrop-blur-xl rounded-lg text-white placeholder-white/60 border border-white/20 focus:border-emerald-400/50 focus:outline-none transition-all duration-200 text-sm"
            placeholder="Product name"
          />
        </td>
        <td className="py-4 px-6">
          <input
            type="text"
            value={editForm.price}
            onChange={(e) => setEditForm({...editForm, price: e.target.value})}
            className="w-full px-3 py-2 bg-white/10 backdrop-blur-xl rounded-lg text-white placeholder-white/60 border border-white/20 focus:border-emerald-400/50 focus:outline-none transition-all duration-200 text-sm"
            placeholder="Price"
          />
        </td>
        {(category === 'flower' || category === 'vapes') && (
          <>
            <td className="py-4 px-6">
              <input
                type="text"
                value={editForm.thca}
                onChange={(e) => setEditForm({...editForm, thca: e.target.value})}
                className="w-full px-3 py-2 bg-white/10 backdrop-blur-xl rounded-lg text-white placeholder-white/60 border border-white/20 focus:border-emerald-400/50 focus:outline-none transition-all duration-200 text-sm"
                placeholder="THCA %"
              />
            </td>
            <td className="py-4 px-6">
              <input
                type="text"
                value={editForm.terpenes}
                onChange={(e) => setEditForm({...editForm, terpenes: e.target.value})}
                className="w-full px-3 py-2 bg-white/10 backdrop-blur-xl rounded-lg text-white placeholder-white/60 border border-white/20 focus:border-emerald-400/50 focus:outline-none transition-all duration-200 text-sm"
                placeholder="Terpenes"
              />
            </td>
          </>
        )}
        {category === 'edibles' && (
          <td className="py-4 px-6">
            <input
              type="text"
              value={editForm.dosage}
              onChange={(e) => setEditForm({...editForm, dosage: e.target.value})}
              className="w-full px-3 py-2 bg-white/10 backdrop-blur-xl rounded-lg text-white placeholder-white/60 border border-white/20 focus:border-emerald-400/50 focus:outline-none transition-all duration-200 text-sm"
              placeholder="Dosage"
            />
          </td>
        )}
        <td className="py-4 px-6">
          <button
            onClick={() => onUpdate(product, { in_stock: !product.in_stock })}
            className={`px-3 py-1 text-xs rounded-full transition-all duration-200 font-apple-medium ${
              product.in_stock 
                ? 'bg-green-500/80 text-white hover:bg-green-500' 
                : 'bg-red-500/80 text-white hover:bg-red-500'
            }`}
            disabled={saving}
          >
            {product.in_stock ? 'In Stock' : 'Out of Stock'}
          </button>
        </td>
        <td className="py-4 px-6 text-right">
          <div className="flex justify-end space-x-2">
            <button
              onClick={handleSave}
              className="px-3 py-1 bg-emerald-600/80 hover:bg-emerald-600 rounded-lg text-xs transition-all duration-200 text-white font-apple-medium"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={handleCancel}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-xs transition-all duration-200 text-white font-apple-medium"
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </td>
      </tr>
    )
  }

  return (
    <tr 
      className={`${isSelected ? 'bg-emerald-900/20 border-emerald-400/30' : isEven ? 'bg-white/5' : ''} hover:bg-white/10 transition-all duration-200 border-b border-white/5 cursor-pointer select-none`}
      onClick={handleRowClick}
    >
      <td className="py-4 px-6">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelection}
          className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
        />
      </td>
      <td className="py-4 px-6">
        <div className="font-apple-semibold text-white">{product.name}</div>
        {product.description && (
          <div className="text-xs text-white/60 font-apple-medium mt-1 max-w-xs truncate">{product.description}</div>
        )}
      </td>
      <td className="py-4 px-6">
        <span className="text-emerald-400 font-apple-bold">{product.price}</span>
      </td>
      {(category === 'flower' || category === 'vapes') && (
        <>
          <td className="py-4 px-6">
            <span className="text-white font-apple-medium">{product.thca || '-'}</span>
          </td>
          <td className="py-4 px-6">
            <span className="text-white/80 font-apple-medium text-sm">
              {product.terpenes && product.terpenes.length > 0 ? product.terpenes[0] : '-'}
            </span>
          </td>
        </>
      )}
      {category === 'edibles' && (
        <td className="py-4 px-6">
          <span className="text-white font-apple-medium">{product.dosage || '-'}</span>
        </td>
      )}
      <td className="py-4 px-6">
        <button
          onClick={() => onUpdate(product, { in_stock: !product.in_stock })}
          className={`px-3 py-1 text-xs rounded-full transition-all duration-200 font-apple-medium ${
            product.in_stock 
              ? 'bg-green-500/80 text-white hover:bg-green-500' 
              : 'bg-red-500/80 text-white hover:bg-red-500'
          }`}
          disabled={saving}
        >
          {product.in_stock ? 'In Stock' : 'Out of Stock'}
        </button>
      </td>
      <td className="py-4 px-6 text-right">
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => setEditing(product)}
            className="px-3 py-1 bg-blue-600/80 hover:bg-blue-600 rounded-lg text-xs transition-all duration-200 text-white font-apple-medium"
            disabled={saving}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(product.id)}
            className="px-3 py-1 bg-red-600/80 hover:bg-red-600 rounded-lg text-xs transition-all duration-200 text-white font-apple-medium"
            disabled={saving}
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  )
}

// Enhanced Pricing Panel with controls
function PricingPanel({
  pricingRules,
  basePricing,
  products,
  onRefresh,
  saving,
  setSaving,
  selectedPricingRules,
  selectedBasePricing,
  onTogglePricingRuleSelection,
  onToggleBasePricingSelection,
  onSelectAllPricingRules,
  onSelectAllBasePricing
}: {
  pricingRules: PricingRule[]
  basePricing: BasePricing[]
  products: Product[]
  onRefresh: () => Promise<void>
  saving: boolean
  setSaving: (saving: boolean) => void
  selectedPricingRules: Set<string>
  selectedBasePricing: Set<string>
  onTogglePricingRuleSelection: (id: string) => void
  onToggleBasePricingSelection: (id: string) => void
  onSelectAllPricingRules: () => void
  onSelectAllBasePricing: () => void
}) {
  const [showAddRule, setShowAddRule] = useState(false)
  const [showPriceCalculator, setShowPriceCalculator] = useState(false)
  const [editingBasePricing, setEditingBasePricing] = useState<BasePricing | null>(null)
  const [showAddBasePricing, setShowAddBasePricing] = useState(false)

  const createPricingRule = async (ruleData: any) => {
    try {
      setSaving(true)
      const response = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(ruleData)
      })

      if (!response.ok) throw new Error('Failed to create pricing rule')
      
      await onRefresh()
      setShowAddRule(false)
    } catch (err) {
      alert('Error creating pricing rule: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const deletePricingRule = async (ruleId: string) => {
    if (!confirm('Are you sure you want to delete this pricing rule?')) return

    try {
      setSaving(true)
      const response = await fetch(`/api/pricing/${ruleId}?type=pricing_rule`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete pricing rule')
      
      await onRefresh()
    } catch (err) {
      alert('Error deleting pricing rule: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const updateBasePricing = async (pricing: BasePricing, updates: Partial<BasePricing>) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/pricing/${pricing.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'base_pricing', data: { ...pricing, ...updates } })
      })

      if (!response.ok) throw new Error('Failed to update base pricing')
      await onRefresh()
      setEditingBasePricing(null)
    } catch (error) {
      alert('Error updating base pricing: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const createBasePricing = async (pricingData: Omit<BasePricing, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      setSaving(true)
      const response = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'base_pricing', data: pricingData })
      })

      if (!response.ok) throw new Error('Failed to create base pricing')
      await onRefresh()
      setShowAddBasePricing(false)
    } catch (error) {
      alert('Error creating base pricing: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const deleteBasePricing = async (pricingId: string) => {
    if (!confirm('Are you sure you want to delete this pricing tier?')) return

    try {
      setSaving(true)
      const response = await fetch(`/api/pricing/${pricingId}?type=base_pricing`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete base pricing')
      await onRefresh()
    } catch (error) {
      alert('Error deleting base pricing: ' + (error instanceof Error ? error.message : 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white/5 backdrop-blur-md rounded-xl border border-white/20">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-don-graffiti text-white tracking-wide drop-shadow-lg" style={{ textShadow: '0 4px 8px rgba(0, 0, 0, 0.7)' }}>Pricing</h2>
          <div className="flex space-x-3">
            <button
              onClick={onRefresh}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-lg transition-all duration-200 flex items-center space-x-2 text-white font-apple-medium border border-white/20"
              disabled={saving}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
            <button
              onClick={onSelectAllPricingRules}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-xl text-sm transition-all duration-200 text-white font-apple-medium border border-white/20"
            >
              Select All Rules
            </button>
            <button
              onClick={() => setShowPriceCalculator(true)}
              className="px-6 py-3 bg-blue-600/80 hover:bg-blue-600 backdrop-blur-xl rounded-xl transition-all duration-200 text-white font-apple-medium border border-blue-400/30"
            >
              Price Calculator
            </button>
            <button
              onClick={() => setShowAddRule(true)}
              className="px-6 py-3 bg-emerald-600/80 hover:bg-emerald-600 backdrop-blur-xl rounded-xl transition-all duration-200 text-white font-apple-medium border border-emerald-400/30"
              disabled={saving}
            >
              + Add Pricing Rule
            </button>
          </div>
        </div>
      </div>

      {/* Active Pricing Rules */}
      <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <h3 className="text-xl font-apple-bold text-white mb-4 drop-shadow-lg">Active Pricing Rules ({pricingRules.length})</h3>
        {pricingRules.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pricingRules.map(rule => (
              <div 
                key={rule.id} 
                className={`bg-white/10 backdrop-blur-md rounded-xl p-4 border transition-all duration-200 cursor-pointer select-none ${
                  selectedPricingRules.has(rule.id) ? 'border-emerald-400/50 bg-emerald-900/20' : 'border-white/20'
                } hover:bg-white/15`}
                onClick={(e) => {
                  // Don't trigger selection if clicking on buttons, inputs, or other interactive elements
                  if ((e.target as HTMLElement).tagName === 'BUTTON' || 
                      (e.target as HTMLElement).tagName === 'INPUT' ||
                      (e.target as HTMLElement).closest('button') ||
                      (e.target as HTMLElement).closest('input')) {
                    return
                  }
                  onTogglePricingRuleSelection(rule.id)
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedPricingRules.has(rule.id)}
                      onChange={() => onTogglePricingRuleSelection(rule.id)}
                      className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                    />
                    <h4 className="font-apple-semibold text-white">{rule.name}</h4>
                  </div>
                  <button
                    onClick={() => deletePricingRule(rule.id)}
                    className="text-red-400 hover:text-red-300 text-sm font-apple-medium transition-colors duration-200"
                    disabled={saving}
                  >
                    Delete
                  </button>
                </div>
                <p className="text-sm text-white/70 capitalize mb-2 font-apple-medium">
                  {rule.category} • {rule.type.replace('_', ' ')}
                </p>
                <div className="text-lg font-apple-bold text-emerald-400 mb-2">
                  {rule.type === 'percentage_discount' ? `${rule.value}% OFF` : `$${rule.value}`}
                </div>
                <div className="text-xs text-white/60 mt-1 font-apple-medium">
                  Priority: {rule.priority}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-white/60 py-8">
            <div className="text-lg font-apple-semibold mb-2">No pricing rules active</div>
            <div className="text-sm font-apple-medium">Create your first rule to manage discounts and promotions.</div>
          </div>
        )}
      </div>

      {/* Base Pricing Management */}
      <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-apple-bold text-white drop-shadow-lg">Base Pricing Management</h3>
          <div className="flex space-x-3">
            <button
              onClick={onSelectAllBasePricing}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-lg text-sm transition-all duration-200 text-white font-apple-medium border border-white/20"
            >
              Select All
            </button>
            <button
              onClick={() => setShowAddBasePricing(true)}
              className="px-4 py-2 bg-green-600/80 hover:bg-green-600 backdrop-blur-xl rounded-lg transition-all duration-200 text-white font-apple-medium border border-green-400/30"
            >
              + Add Pricing Tier
            </button>
          </div>
        </div>
        
        {['flower', 'vapes', 'edibles', 'concentrates', 'prerolls', 'moonwater'].map(category => {
          const categoryPricing = basePricing.filter(bp => bp.category === category && bp.is_active)
          
          if (categoryPricing.length === 0) return null
          
          return (
            <div key={category} className="mb-6 bg-white/10 backdrop-blur-md rounded-xl border border-white/20 p-4">
              <h4 className="font-apple-semibold text-white capitalize mb-3 drop-shadow-lg text-lg">
                {category} ({categoryPricing.length} tiers)
              </h4>
              <div className="space-y-2">
                {categoryPricing
                  .sort((a, b) => {
                    // Custom sort for better display order
                    const order = ['1g', '3.5g', '7g', '14g', '28g', '1 cart', '2 carts', '3 carts', '1 pack', '2 packs', '3 packs', '1 roll', '3 rolls', '5 rolls']
                    const aIndex = order.indexOf(a.weight_or_quantity)
                    const bIndex = order.indexOf(b.weight_or_quantity)
                    if (aIndex !== -1 && bIndex !== -1) return aIndex - bIndex
                    return a.weight_or_quantity.localeCompare(b.weight_or_quantity)
                  })
                  .map((pricing, index) => (
                    <div 
                      key={pricing.id} 
                      className={`flex items-center justify-between p-3 rounded-lg transition-all duration-200 cursor-pointer select-none ${
                        selectedBasePricing.has(pricing.id!) 
                          ? 'bg-emerald-900/20 border border-emerald-400/30' 
                          : index % 2 === 0 ? 'bg-white/5' : 'bg-white/10'
                      } hover:bg-white/15`}
                      onClick={(e) => {
                        // Don't trigger selection if clicking on buttons, inputs, or other interactive elements
                        if ((e.target as HTMLElement).tagName === 'BUTTON' || 
                            (e.target as HTMLElement).tagName === 'INPUT' ||
                            (e.target as HTMLElement).closest('button') ||
                            (e.target as HTMLElement).closest('input')) {
                          return
                        }
                        onToggleBasePricingSelection(pricing.id!)
                      }}
                    >
                      {editingBasePricing?.id === pricing.id ? (
                        <div className="flex items-center space-x-4 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedBasePricing.has(pricing.id!)}
                            onChange={() => onToggleBasePricingSelection(pricing.id!)}
                            className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                          />
                          <input
                            type="text"
                            value={editingBasePricing.weight_or_quantity}
                            onChange={(e) => setEditingBasePricing({...editingBasePricing, weight_or_quantity: e.target.value})}
                            className="px-3 py-1 bg-white/20 backdrop-blur-xl rounded text-white placeholder-white/60 text-sm border border-white/30 focus:border-emerald-400/50 focus:outline-none w-24"
                          />
                          <span className="text-white/60">→</span>
                          <div className="flex items-center space-x-2">
                            <span className="text-white/60">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={editingBasePricing.base_price}
                              onChange={(e) => setEditingBasePricing({...editingBasePricing, base_price: parseFloat(e.target.value) || 0})}
                              className="px-3 py-1 bg-white/20 backdrop-blur-xl rounded text-white placeholder-white/60 text-sm border border-white/30 focus:border-emerald-400/50 focus:outline-none w-20"
                            />
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => updateBasePricing(pricing, editingBasePricing)}
                              className="px-3 py-1 bg-green-600/80 hover:bg-green-600 rounded text-white text-sm font-apple-medium transition-all duration-200"
                              disabled={saving}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingBasePricing(null)}
                              className="px-3 py-1 bg-gray-600/80 hover:bg-gray-600 rounded text-white text-sm font-apple-medium transition-all duration-200"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center space-x-4">
                            <input
                              type="checkbox"
                              checked={selectedBasePricing.has(pricing.id!)}
                              onChange={() => onToggleBasePricingSelection(pricing.id!)}
                              className="rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400"
                            />
                            <span className="text-white font-apple-semibold min-w-[80px]">
                              {pricing.weight_or_quantity}
                            </span>
                            <span className="text-emerald-400 font-apple-bold text-lg">
                              ${pricing.base_price}
                            </span>
                          </div>
                          <div className="flex space-x-2">
                            <button
                              onClick={() => setEditingBasePricing(pricing)}
                              className="px-3 py-1 bg-blue-600/80 hover:bg-blue-600 rounded text-white text-sm font-apple-medium transition-all duration-200"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteBasePricing(pricing.id!)}
                              className="px-3 py-1 bg-red-600/80 hover:bg-red-600 rounded text-white text-sm font-apple-medium transition-all duration-200"
                              disabled={saving}
                            >
                              Delete
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )
        })}
        
        {basePricing.length === 0 && (
          <div className="text-center text-white/60 py-8">
            <div className="text-lg font-apple-semibold mb-2">No base pricing configured</div>
            <div className="text-sm font-apple-medium">Add pricing tiers to display on your menus.</div>
          </div>
        )}
      </div>

      {/* Add Pricing Rule Modal */}
      {showAddRule && (
        <AddPricingRuleModal
          onAdd={createPricingRule}
          onClose={() => setShowAddRule(false)}
          saving={saving}
        />
      )}

      {/* Price Calculator Modal */}
      {showPriceCalculator && (
        <PriceCalculatorModal
          products={products}
          onClose={() => setShowPriceCalculator(false)}
        />
      )}

      {/* Add Base Pricing Modal */}
      {showAddBasePricing && (
        <AddBasePricingModal
          onAdd={createBasePricing}
          onClose={() => setShowAddBasePricing(false)}
          saving={saving}
        />
      )}
    </div>
  )
}

// Specials Panel for managing daily/weekly specials
function SpecialsPanel({
  products,
  onRefresh,
  saving,
  setSaving,
  selectedSpecials,
  onToggleSpecialSelection,
  onSelectAllSpecials
}: {
  products: Product[]
  onRefresh: () => Promise<void>
  saving: boolean
  setSaving: (saving: boolean) => void
  selectedSpecials: Set<string>
  onToggleSpecialSelection: (id: string) => void
  onSelectAllSpecials: (specialIds: string[]) => void
}) {
  const [specials, setSpecials] = useState<any[]>([])
  const [showAddSpecial, setShowAddSpecial] = useState(false)
  const [editingSpecial, setEditingSpecial] = useState<any | null>(null)

  useEffect(() => {
    fetchSpecials()
  }, [])

  const fetchSpecials = async () => {
    try {
      const response = await fetch('/api/pricing')
      if (response.ok) {
        const data = await response.json()
        // Get all pricing rules that are specials, bundles, discounts
        const allSpecials = (data.pricing_rules || []).filter((rule: any) => 
          ['special', 'bundle', 'percentage_discount', 'fixed_discount'].includes(rule.type)
        )
        setSpecials(allSpecials)
      }
    } catch (err) {
      console.error('Error fetching specials:', err)
    }
  }

  const createSpecial = async (specialData: any) => {
    try {
      setSaving(true)
      const response = await fetch('/api/pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...specialData, type: 'special' })
      })

      if (!response.ok) throw new Error('Failed to create special')
      
      await fetchSpecials()
      await onRefresh()
      setShowAddSpecial(false)
    } catch (err) {
      alert('Error creating special: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const updateSpecial = async (specialId: string, updates: any) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/pricing/${specialId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      })

      if (!response.ok) throw new Error('Failed to update special')
      
      await fetchSpecials()
      await onRefresh()
      setEditingSpecial(null)
    } catch (err) {
      alert('Error updating special: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const toggleSpecialStatus = async (specialId: string, isActive: boolean) => {
    try {
      setSaving(true)
      const response = await fetch(`/api/pricing/${specialId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      })

      if (!response.ok) throw new Error('Failed to toggle special status')
      
      await fetchSpecials()
      await onRefresh()
    } catch (err) {
      alert('Error toggling special: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const deleteSpecial = async (specialId: string) => {
    if (!confirm('Are you sure you want to delete this special?')) return

    try {
      setSaving(true)
      const response = await fetch(`/api/pricing/${specialId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete special')
      
      await fetchSpecials()
      await onRefresh()
    } catch (err) {
      alert('Error deleting special: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'percentage_discount': return 'purple-400'
      case 'fixed_discount': return 'emerald-400'
      case 'bundle': return 'amber-400'
      case 'special': return 'pink-400'
      default: return 'white'
    }
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'percentage_discount': return 'PERCENTAGE DISCOUNT'
      case 'fixed_discount': return 'SPECIAL OFFER'
      case 'bundle': return 'BUNDLE DEAL'
      case 'special': return 'SPECIAL OFFER'
      default: return 'SPECIAL OFFER'
    }
  }

  const formatValue = (special: any) => {
    switch (special.type) {
      case 'percentage_discount': return `${special.value}% OFF`
      case 'fixed_discount': return `$${special.value}`
      case 'bundle': return `$${special.value}`
      case 'special': return `$${special.value}`
      default: return `$${special.value}`
    }
  }

  const handleRowClick = (special: any, e: React.MouseEvent) => {
    // Don't trigger selection if clicking on buttons, inputs, or other interactive elements
    if ((e.target as HTMLElement).tagName === 'BUTTON' || 
        (e.target as HTMLElement).tagName === 'INPUT' ||
        (e.target as HTMLElement).closest('button') ||
        (e.target as HTMLElement).closest('input')) {
      return
    }
    onToggleSpecialSelection(special.id)
  }

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white/5 backdrop-blur-md rounded-xl border border-white/20">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-don-graffiti text-white tracking-wide drop-shadow-lg" style={{ textShadow: '0 4px 8px rgba(0, 0, 0, 0.7)' }}>SPECIALS & DEALS</h2>
          <div className="flex space-x-3">
            <button
              onClick={onRefresh}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-lg transition-all duration-200 flex items-center space-x-2 text-white font-apple-medium border border-white/20"
              disabled={saving}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
            <button
              onClick={() => onSelectAllSpecials(specials.map(s => s.id))}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-xl text-sm transition-all duration-200 text-white font-apple-medium border border-white/20"
            >
              Select All
            </button>
            <button
              onClick={() => setShowAddSpecial(true)}
              className="px-6 py-3 bg-purple-600/80 hover:bg-purple-600 backdrop-blur-xl rounded-xl transition-all duration-200 text-white font-apple-medium border border-purple-400/30"
              disabled={saving}
            >
              + Create Special
            </button>
          </div>
        </div>
      </div>

      {/* All Specials & Deals */}
      <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
        <div className="p-6 border-b border-white/10">
          <h3 className="text-xl font-apple-bold text-white drop-shadow-lg">All Specials & Deals ({specials.length})</h3>
        </div>
        
        {specials.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-white/10 border-b border-white/10">
                  <th className="text-left py-4 px-6 font-apple-semibold text-white/80 text-sm w-12">
                    <input
                      type="checkbox"
                      checked={specials.length > 0 && specials.every(s => selectedSpecials.has(s.id))}
                      onChange={() => {
                        if (specials.every(s => selectedSpecials.has(s.id))) {
                          // Deselect all
                          specials.forEach(s => onToggleSpecialSelection(s.id))
                        } else {
                          // Select all
                          onSelectAllSpecials(specials.map(s => s.id))
                        }
                      }}
                      className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                    />
                  </th>
                  <th className="text-left py-4 px-6 font-apple-semibold text-white/80 text-sm">NAME</th>
                  <th className="text-left py-4 px-6 font-apple-semibold text-white/80 text-sm">TYPE</th>
                  <th className="text-left py-4 px-6 font-apple-semibold text-white/80 text-sm">CATEGORY</th>
                  <th className="text-left py-4 px-6 font-apple-semibold text-white/80 text-sm">VALUE</th>
                  <th className="text-left py-4 px-6 font-apple-semibold text-white/80 text-sm">STATUS</th>
                  <th className="text-left py-4 px-6 font-apple-semibold text-white/80 text-sm">EXPIRES</th>
                  <th className="text-right py-4 px-6 font-apple-semibold text-white/80 text-sm">ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {specials.map((special, index) => (
                  <tr 
                    key={special.id} 
                    className={`transition-all duration-200 cursor-pointer select-none border-b border-white/5 ${
                      selectedSpecials.has(special.id) 
                        ? 'bg-emerald-900/20 border-emerald-400/30' 
                        : index % 2 === 0 ? 'bg-white/5' : 'bg-white/2'
                    } hover:bg-white/10`}
                    onClick={(e) => handleRowClick(special, e)}
                  >
                    {editingSpecial?.id === special.id ? (
                      // Edit Mode
                      <>
                        <td className="py-4 px-6">
                          <input
                            type="checkbox"
                            checked={selectedSpecials.has(special.id)}
                            onChange={() => onToggleSpecialSelection(special.id)}
                            className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <input
                            type="text"
                            value={editingSpecial.name}
                            onChange={(e) => setEditingSpecial({...editingSpecial, name: e.target.value})}
                            className="w-full px-3 py-2 bg-white/10 text-white rounded-lg border border-white/20 focus:border-emerald-400/50 focus:outline-none text-sm"
                            placeholder="Special name"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <div className={`inline-flex px-3 py-1 rounded-full text-xs font-apple-medium bg-${getTypeColor(special.type)}/20 text-${getTypeColor(special.type)}`}>
                            {getTypeLabel(special.type)}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <select
                            value={editingSpecial.category}
                            onChange={(e) => setEditingSpecial({...editingSpecial, category: e.target.value})}
                            className="w-full px-3 py-2 bg-white/10 text-white rounded-lg border border-white/20 focus:border-emerald-400/50 focus:outline-none text-sm"
                          >
                            <option value="flower">Flower</option>
                            <option value="vapes">Vapes</option>
                            <option value="edibles">Edibles</option>
                            <option value="all">All Categories</option>
                          </select>
                        </td>
                        <td className="py-4 px-6">
                          <input
                            type="number"
                            value={editingSpecial.value}
                            onChange={(e) => setEditingSpecial({...editingSpecial, value: parseFloat(e.target.value)})}
                            className="w-full px-3 py-2 bg-white/10 text-white rounded-lg border border-white/20 focus:border-emerald-400/50 focus:outline-none text-sm"
                            placeholder="Value"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <div className={`inline-flex px-3 py-1 rounded-full text-xs font-apple-medium ${
                            special.is_active ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                          }`}>
                            {special.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <input
                            type="date"
                            value={editingSpecial.valid_until ? editingSpecial.valid_until.split('T')[0] : ''}
                            onChange={(e) => setEditingSpecial({...editingSpecial, valid_until: e.target.value ? e.target.value + 'T23:59:59' : null})}
                            className="w-full px-3 py-2 bg-white/10 text-white rounded-lg border border-white/20 focus:border-emerald-400/50 focus:outline-none text-sm"
                          />
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => updateSpecial(special.id, editingSpecial)}
                              className="px-3 py-1 bg-green-500/80 hover:bg-green-500 text-white rounded-lg text-sm font-apple-medium transition-all duration-200"
                              disabled={saving}
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingSpecial(null)}
                              className="px-3 py-1 bg-gray-500/80 hover:bg-gray-500 text-white rounded-lg text-sm font-apple-medium transition-all duration-200"
                              disabled={saving}
                            >
                              Cancel
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      // View Mode
                      <>
                        <td className="py-4 px-6">
                          <input
                            type="checkbox"
                            checked={selectedSpecials.has(special.id)}
                            onChange={() => onToggleSpecialSelection(special.id)}
                            className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                          />
                        </td>
                        <td className="py-4 px-6">
                          <div className="font-apple-semibold text-white text-lg">{special.name}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className={`inline-flex px-3 py-1 rounded-full text-xs font-apple-medium bg-${getTypeColor(special.type)}/20 text-${getTypeColor(special.type)}`}>
                            {getTypeLabel(special.type)}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-white/70 font-apple-medium capitalize">{special.category}</div>
                        </td>
                        <td className="py-4 px-6">
                          <div className={`text-${getTypeColor(special.type)} font-apple-bold text-lg`}>
                            {formatValue(special)}
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <button
                            onClick={() => toggleSpecialStatus(special.id, special.is_active)}
                            className={`inline-flex px-3 py-1 rounded-full text-xs font-apple-medium transition-all duration-200 ${
                              special.is_active 
                                ? `bg-green-500/20 text-green-400 hover:bg-green-500/30`
                                : 'bg-red-500/20 text-red-400 hover:bg-red-500/30'
                            }`}
                            disabled={saving}
                          >
                            {special.is_active ? 'ACTIVE' : 'INACTIVE'}
                          </button>
                        </td>
                        <td className="py-4 px-6">
                          <div className="text-white/60 font-apple-medium text-sm">
                            {special.valid_until ? new Date(special.valid_until).toLocaleDateString() : 'No expiry'}
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => setEditingSpecial(special)}
                              className="px-3 py-1 bg-blue-500/80 hover:bg-blue-500 text-white rounded-lg text-sm font-apple-medium transition-all duration-200"
                              disabled={saving}
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => deleteSpecial(special.id)}
                              className="px-3 py-1 bg-red-500/80 hover:bg-red-500 text-white rounded-lg text-sm font-apple-medium transition-all duration-200"
                              disabled={saving}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center text-white/60 py-12">
            <div className="text-lg font-apple-semibold mb-2">No specials created</div>
            <div className="text-sm font-apple-medium">Create specials and deals to attract customers.</div>
          </div>
        )}
      </div>

      {/* Add Special Modal */}
      {showAddSpecial && (
        <AddSpecialModal
          products={products}
          onAdd={createSpecial}
          onClose={() => setShowAddSpecial(false)}
          saving={saving}
        />
      )}
    </div>
  )
}

// Bundles Panel for creating product bundles
function BundlesPanel({
  products,
  onRefresh,
  saving,
  setSaving,
  selectedBundles,
  onToggleBundleSelection,
  onSelectAllBundles
}: {
  products: Product[]
  onRefresh: () => Promise<void>
  saving: boolean
  setSaving: (saving: boolean) => void
  selectedBundles: Set<string>
  onToggleBundleSelection: (id: string) => void
  onSelectAllBundles: (bundleIds: string[]) => void
}) {
  const [bundles, setBundles] = useState<any[]>([])
  const [showCreateBundle, setShowCreateBundle] = useState(false)

  useEffect(() => {
    fetchBundles()
  }, [])

  const fetchBundles = async () => {
    try {
      const response = await fetch('/api/bundles')
      if (response.ok) {
        const data = await response.json()
        setBundles(data.bundles || [])
      }
    } catch (err) {
      console.error('Error fetching bundles:', err)
    }
  }

  const createBundle = async (bundleData: any) => {
    try {
      setSaving(true)
      const response = await fetch('/api/bundles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bundleData)
      })

      if (!response.ok) throw new Error('Failed to create bundle')
      
      await fetchBundles()
      await onRefresh()
      setShowCreateBundle(false)
    } catch (err) {
      alert('Error creating bundle: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const deleteBundle = async (bundleId: string) => {
    if (!confirm('Are you sure you want to delete this bundle?')) return

    try {
      setSaving(true)
      const response = await fetch(`/api/bundles/${bundleId}`, {
        method: 'DELETE'
      })

      if (!response.ok) throw new Error('Failed to delete bundle')
      
      await fetchBundles()
      await onRefresh()
    } catch (err) {
      alert('Error deleting bundle: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white/5 backdrop-blur-md rounded-xl border border-white/20">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-don-graffiti text-white tracking-wide drop-shadow-lg" style={{ textShadow: '0 4px 8px rgba(0, 0, 0, 0.7)' }}>Bundle Deals</h2>
          <div className="flex space-x-3">
            <button
              onClick={onRefresh}
              className="px-3 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-lg transition-all duration-200 flex items-center space-x-2 text-white font-apple-medium border border-white/20"
              disabled={saving}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
            <button
              onClick={() => onSelectAllBundles(bundles.map(b => b.id))}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 backdrop-blur-xl rounded-xl text-sm transition-all duration-200 text-white font-apple-medium border border-white/20"
            >
              Select All
            </button>
            <button
              onClick={() => setShowCreateBundle(true)}
              className="px-6 py-3 bg-amber-600/80 hover:bg-amber-600 backdrop-blur-xl rounded-xl transition-all duration-200 text-white font-apple-medium border border-amber-400/30"
              disabled={saving}
            >
              + Create Bundle
            </button>
          </div>
        </div>
      </div>

      {/* Active Bundles */}
      <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/20 p-6">
        <h3 className="text-xl font-apple-bold text-white mb-4 drop-shadow-lg">Active Bundles ({bundles.length})</h3>
        {bundles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {bundles.map(bundle => (
              <div 
                key={bundle.id} 
                className={`bg-white/10 backdrop-blur-md rounded-xl p-4 border transition-all duration-200 cursor-pointer select-none ${
                  selectedBundles.has(bundle.id) ? 'border-emerald-400/50 bg-emerald-900/20' : 'border-white/20'
                } hover:bg-white/15`}
                onClick={(e) => {
                  // Don't trigger selection if clicking on buttons, inputs, or other interactive elements
                  if ((e.target as HTMLElement).tagName === 'BUTTON' || 
                      (e.target as HTMLElement).tagName === 'INPUT' ||
                      (e.target as HTMLElement).closest('button') ||
                      (e.target as HTMLElement).closest('input')) {
                    return
                  }
                  onToggleBundleSelection(bundle.id)
                }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selectedBundles.has(bundle.id)}
                      onChange={() => onToggleBundleSelection(bundle.id)}
                      className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                    />
                    <h4 className="font-apple-semibold text-white">{bundle.name}</h4>
                  </div>
                  <button
                    onClick={() => deleteBundle(bundle.id)}
                    className="text-red-400 hover:text-red-300 text-sm font-apple-medium transition-colors duration-200"
                    disabled={saving}
                  >
                    Delete
                  </button>
                </div>
                  <p className="text-sm text-white/70 mb-2 font-apple-medium">{bundle.description}</p>
                  <div className="text-sm text-white/60 mb-2 font-apple-medium">
                  {bundle.conditions?.bundle_type === 'category' ? (
                    <>
                      Type: Category-based bundle
                      {bundle.conditions?.category_requirements && (
                        <div className="mt-1 text-xs text-white/50">
                          {Object.entries(bundle.conditions.category_requirements).map(([category, req]: [string, any]) => (
                            <div key={category}>
                              {req.quantity}x {category.charAt(0).toUpperCase() + category.slice(1)}
                              {req.weight && ` (${req.weight} each)`}
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <>
                      Products: {bundle.conditions?.specific_products?.length || 0} items
                      {bundle.conditions?.product_details && (
                        <div className="mt-1 text-xs text-white/50">
                          {Object.entries(bundle.conditions.product_details).map(([productId, details]: [string, any]) => {
                            const product = products.find(p => p.id === productId)
                            if (!product) return null
                            return (
                              <div key={productId}>
                                {product.name}: {details.weight || `${details.quantity || 1}x`}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
                <div className="flex justify-between items-center">
                  <div className="text-lg font-apple-bold text-emerald-400">
                    ${bundle.value}
                  </div>
                  <div className="text-sm text-green-400 font-apple-medium">
                    Save ${((bundle.conditions?.original_price || 0) - bundle.value).toFixed(2)} ({bundle.conditions?.discount_percentage || 0}%)
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-white/60 py-8">
            <div className="text-lg font-apple-semibold mb-2">No bundles created</div>
            <div className="text-sm font-apple-medium">Create product bundles to increase average order value.</div>
          </div>
        )}
      </div>



      {/* Create Bundle Modal */}
      {showCreateBundle && (
        <CreateBundleModal
          products={products}
          onAdd={createBundle}
          onClose={() => setShowCreateBundle(false)}
          saving={saving}
        />
      )}
    </div>
  )
}

function SettingsPanel({ settings, onRefresh }: { settings: any, onRefresh?: () => Promise<void> }) {
  const [activeSettingsTab, setActiveSettingsTab] = useState<'global' | 'layout' | 'flower' | 'vapes' | 'edibles' | 'effects' | 'behavior'>('global')
  const [localSettings, setLocalSettings] = useState(settings)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  // Update local settings when settings prop changes
  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const updateSetting = async (key: string, value: any) => {
    try {
      setSaving(true)
      console.log('Updating setting:', key, '=', value, '(type:', typeof value, ')')
      
      const response = await fetch('/api/menu-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          setting_key: key, 
          setting_value: value 
        })
      })

      const responseText = await response.text()
      console.log('API Response:', response.status, responseText)

      if (!response.ok) {
        let errorMessage = 'Failed to update setting'
        try {
          const errorData = JSON.parse(responseText)
          errorMessage = errorData.error || errorMessage
        } catch {
          errorMessage = responseText || errorMessage
        }
        throw new Error(errorMessage)
      }

      const result = JSON.parse(responseText)
      console.log('Setting updated successfully:', result)
      
      setLastSaved(new Date())
      if (onRefresh) {
        await onRefresh()
      }
    } catch (err) {
      console.error('Error updating setting:', err)
      alert('Error updating setting: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  const handleSettingChange = (key: string, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }))
    updateSetting(key, value)
  }

  const resetToDefaults = async () => {
    if (!confirm('Reset all settings to defaults? This cannot be undone.')) return

    try {
      setSaving(true)
      const response = await fetch('/api/menu-settings', {
        method: 'PUT'
      })
      if (!response.ok) {
        throw new Error('Failed to reset settings')
      }
      if (onRefresh) {
        await onRefresh()
      }
    } catch (err) {
      alert('Error resetting settings: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="p-6 bg-white/5 backdrop-blur-md rounded-xl border border-white/20">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-don-graffiti text-white tracking-wide drop-shadow-lg" style={{ textShadow: '0 4px 8px rgba(0, 0, 0, 0.7)' }}>Settings</h2>
            <p className="text-white/60 font-apple-medium mt-2">Configure menu display and behavior</p>
          </div>
          <div className="flex items-center space-x-4">
            {lastSaved && (
              <span className="text-xs text-emerald-400 font-apple-medium">
                Last saved: {lastSaved.toLocaleTimeString()}
              </span>
            )}
            <button
              onClick={resetToDefaults}
              className="px-4 py-2 bg-orange-600/80 hover:bg-orange-600 backdrop-blur-xl rounded-xl transition-all duration-200 text-white font-apple-medium border border-orange-400/30"
              disabled={saving}
            >
              Reset All to Defaults
            </button>
          </div>
        </div>
      </div>

      {/* Settings Tabs */}
      <div className="bg-white/5 backdrop-blur-md rounded-xl border border-white/20 overflow-hidden">
        {/* Tab Navigation */}
        <div className="border-b border-white/10 overflow-x-auto">
          <div className="flex">
            {[
              { key: 'global', label: 'Global Display', icon: '🎨' },
              { key: 'layout', label: 'Layout', icon: '📐' },
              { key: 'flower', label: 'Flower Page', icon: '🌿' },
              { key: 'vapes', label: 'Vapes Page', icon: '💨' },
              { key: 'edibles', label: 'Edibles Page', icon: '🍪' },
              { key: 'effects', label: 'Effects & Animation', icon: '✨' },
              { key: 'behavior', label: 'Menu Behavior', icon: '⚙️' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveSettingsTab(tab.key as any)}
                className={`px-6 py-4 font-apple-medium transition-all duration-200 whitespace-nowrap border-b-2 ${
                  activeSettingsTab === tab.key
                    ? 'text-emerald-400 bg-white/5 border-emerald-400'
                    : 'text-white/70 hover:text-white border-transparent hover:bg-white/5'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Global Display Settings */}
          {activeSettingsTab === 'global' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-apple-semibold text-white mb-3">
                    Global Font Scale
                    <span className="text-emerald-400 ml-2">{localSettings.global_font_scale || 100}%</span>
                  </label>
                  <input
                    type="range"
                    min="50"
                    max="150"
                    step="5"
                    value={localSettings.global_font_scale || 100}
                    onChange={(e) => handleSettingChange('global_font_scale', parseInt(e.target.value))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                    disabled={saving}
                  />
                  <div className="flex justify-between text-xs text-white/60 font-apple-medium mt-1">
                    <span>50%</span>
                    <span>75%</span>
                    <span>100%</span>
                    <span>125%</span>
                    <span>150%</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-apple-semibold text-white mb-3">Theme</label>
                  <select
                    value={localSettings.global_theme || 'dark'}
                    onChange={(e) => handleSettingChange('global_theme', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-xl rounded-lg text-white border border-white/20 focus:border-emerald-400/50 focus:outline-none transition-all duration-200 font-apple-medium"
                    disabled={saving}
                  >
                    <option value="dark">Dark</option>
                    <option value="light">Light</option>
                    <option value="midnight">Midnight</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-apple-semibold text-white mb-3">Accent Color</label>
                  <input
                    type="color"
                    value={localSettings.global_accent_color || '#10b981'}
                    onChange={(e) => handleSettingChange('global_accent_color', e.target.value)}
                    className="w-full h-12 bg-white/10 backdrop-blur-xl rounded-lg border border-white/20 focus:border-emerald-400/50 focus:outline-none transition-all duration-200 cursor-pointer"
                    disabled={saving}
                  />
                </div>

                <div>
                  <label className="block text-sm font-apple-semibold text-white mb-3">Background Style</label>
                  <select
                    value={localSettings.global_background_style || 'grid'}
                    onChange={(e) => handleSettingChange('global_background_style', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-xl rounded-lg text-white border border-white/20 focus:border-emerald-400/50 focus:outline-none transition-all duration-200 font-apple-medium"
                    disabled={saving}
                  >
                    <option value="grid">Grid Pattern</option>
                    <option value="gradient">Gradient</option>
                    <option value="solid">Solid Color</option>
                    <option value="stars">Starfield</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Layout Settings */}
          {activeSettingsTab === 'layout' && (
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-apple-bold text-white mb-4">Column Configuration</h4>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div>
                    <label className="block text-sm font-apple-semibold text-white mb-3">
                      Flower Columns
                      <span className="text-emerald-400 ml-2">{localSettings.layout_columns_flower || 3}</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="1"
                      value={localSettings.layout_columns_flower || 3}
                      onChange={(e) => handleSettingChange('layout_columns_flower', parseInt(e.target.value))}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                      disabled={saving}
                    />
                    <div className="flex justify-between text-xs text-white/60 font-apple-medium mt-1">
                      <span>1</span>
                      <span>2</span>
                      <span>3</span>
                      <span>4</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-apple-semibold text-white mb-3">
                      Vapes Columns
                      <span className="text-emerald-400 ml-2">{localSettings.layout_columns_vapes || 3}</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="1"
                      value={localSettings.layout_columns_vapes || 3}
                      onChange={(e) => handleSettingChange('layout_columns_vapes', parseInt(e.target.value))}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                      disabled={saving}
                    />
                    <div className="flex justify-between text-xs text-white/60 font-apple-medium mt-1">
                      <span>1</span>
                      <span>2</span>
                      <span>3</span>
                      <span>4</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-apple-semibold text-white mb-3">
                      Edibles Columns
                      <span className="text-emerald-400 ml-2">{localSettings.layout_columns_edibles || 2}</span>
                    </label>
                    <input
                      type="range"
                      min="1"
                      max="4"
                      step="1"
                      value={localSettings.layout_columns_edibles || 2}
                      onChange={(e) => handleSettingChange('layout_columns_edibles', parseInt(e.target.value))}
                      className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                      disabled={saving}
                    />
                    <div className="flex justify-between text-xs text-white/60 font-apple-medium mt-1">
                      <span>1</span>
                      <span>2</span>
                      <span>3</span>
                      <span>4</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-sm font-apple-semibold text-white mb-3">Section Style</label>
                  <select
                    value={localSettings.layout_section_style || 'cards'}
                    onChange={(e) => handleSettingChange('layout_section_style', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-xl rounded-lg text-white border border-white/20 focus:border-emerald-400/50 focus:outline-none transition-all duration-200 font-apple-medium"
                    disabled={saving}
                  >
                    <option value="cards">Cards</option>
                    <option value="list">List</option>
                    <option value="compact">Compact</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-apple-semibold text-white mb-3">Header Style</label>
                  <select
                    value={localSettings.layout_header_style || 'modern'}
                    onChange={(e) => handleSettingChange('layout_header_style', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-xl rounded-lg text-white border border-white/20 focus:border-emerald-400/50 focus:outline-none transition-all duration-200 font-apple-medium"
                    disabled={saving}
                  >
                    <option value="modern">Modern</option>
                    <option value="classic">Classic</option>
                    <option value="minimal">Minimal</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-apple-semibold text-white mb-3">Spacing</label>
                  <select
                    value={localSettings.layout_spacing || 'normal'}
                    onChange={(e) => handleSettingChange('layout_spacing', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-xl rounded-lg text-white border border-white/20 focus:border-emerald-400/50 focus:outline-none transition-all duration-200 font-apple-medium"
                    disabled={saving}
                  >
                    <option value="tight">Tight</option>
                    <option value="normal">Normal</option>
                    <option value="relaxed">Relaxed</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Flower Page Settings */}
          {activeSettingsTab === 'flower' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="flower_show_thca"
                    checked={localSettings.flower_show_thca ?? true}
                    onChange={(e) => handleSettingChange('flower_show_thca', e.target.checked)}
                    className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                    disabled={saving}
                  />
                  <label htmlFor="flower_show_thca" className="text-sm font-apple-semibold text-white">
                    Show THCA %
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="flower_show_terpenes"
                    checked={localSettings.flower_show_terpenes ?? true}
                    onChange={(e) => handleSettingChange('flower_show_terpenes', e.target.checked)}
                    className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                    disabled={saving}
                  />
                  <label htmlFor="flower_show_terpenes" className="text-sm font-apple-semibold text-white">
                    Show Terpenes
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="flower_show_effects"
                    checked={localSettings.flower_show_effects ?? true}
                    onChange={(e) => handleSettingChange('flower_show_effects', e.target.checked)}
                    className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                    disabled={saving}
                  />
                  <label htmlFor="flower_show_effects" className="text-sm font-apple-semibold text-white">
                    Show Effects
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="flower_show_type_headers"
                    checked={localSettings.flower_show_type_headers ?? true}
                    onChange={(e) => handleSettingChange('flower_show_type_headers', e.target.checked)}
                    className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                    disabled={saving}
                  />
                  <label htmlFor="flower_show_type_headers" className="text-sm font-apple-semibold text-white">
                    Show Type Headers
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="flower_type_colors"
                    checked={localSettings.flower_type_colors ?? true}
                    onChange={(e) => handleSettingChange('flower_type_colors', e.target.checked)}
                    className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                    disabled={saving}
                  />
                  <label htmlFor="flower_type_colors" className="text-sm font-apple-semibold text-white">
                    Use Type Colors
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-apple-semibold text-white mb-3">Effects Display Style</label>
                  <select
                    value={localSettings.flower_effects_style || 'flipboard'}
                    onChange={(e) => handleSettingChange('flower_effects_style', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-xl rounded-lg text-white border border-white/20 focus:border-emerald-400/50 focus:outline-none transition-all duration-200 font-apple-medium"
                    disabled={saving}
                  >
                    <option value="flipboard">Flipboard Animation</option>
                    <option value="static">Static Text</option>
                    <option value="scroll">Scrolling Text</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-apple-semibold text-white mb-3">Group Products By</label>
                  <select
                    value={localSettings.flower_group_by || 'type'}
                    onChange={(e) => handleSettingChange('flower_group_by', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-xl rounded-lg text-white border border-white/20 focus:border-emerald-400/50 focus:outline-none transition-all duration-200 font-apple-medium"
                    disabled={saving}
                  >
                    <option value="type">Strain Type</option>
                    <option value="effects">Effects</option>
                    <option value="alphabetical">Alphabetical</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Vapes Page Settings */}
          {activeSettingsTab === 'vapes' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="vapes_show_terpenes"
                    checked={localSettings.vapes_show_terpenes ?? true}
                    onChange={(e) => handleSettingChange('vapes_show_terpenes', e.target.checked)}
                    className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                    disabled={saving}
                  />
                  <label htmlFor="vapes_show_terpenes" className="text-sm font-apple-semibold text-white">
                    Show Terpenes
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="vapes_show_thca"
                    checked={localSettings.vapes_show_thca ?? true}
                    onChange={(e) => handleSettingChange('vapes_show_thca', e.target.checked)}
                    className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                    disabled={saving}
                  />
                  <label htmlFor="vapes_show_thca" className="text-sm font-apple-semibold text-white">
                    Show THCA %
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="vapes_show_effects"
                    checked={localSettings.vapes_show_effects ?? true}
                    onChange={(e) => handleSettingChange('vapes_show_effects', e.target.checked)}
                    className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                    disabled={saving}
                  />
                  <label htmlFor="vapes_show_effects" className="text-sm font-apple-semibold text-white">
                    Show Effects Flipboard
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="vapes_show_type_headers"
                    checked={localSettings.vapes_show_type_headers ?? true}
                    onChange={(e) => handleSettingChange('vapes_show_type_headers', e.target.checked)}
                    className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                    disabled={saving}
                  />
                  <label htmlFor="vapes_show_type_headers" className="text-sm font-apple-semibold text-white">
                    Show Type Headers
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-apple-semibold text-white mb-3">Group Products By</label>
                <select
                  value={localSettings.vapes_group_by || 'type'}
                  onChange={(e) => handleSettingChange('vapes_group_by', e.target.value)}
                  className="w-full max-w-xs px-4 py-3 bg-white/10 backdrop-blur-xl rounded-lg text-white border border-white/20 focus:border-emerald-400/50 focus:outline-none transition-all duration-200 font-apple-medium"
                  disabled={saving}
                >
                  <option value="type">Strain Type (Indica/Sativa/Hybrid)</option>
                  <option value="alphabetical">Alphabetical</option>
                  <option value="thca">THCA Content</option>
                </select>
              </div>
            </div>
          )}

          {/* Edibles Page Settings */}
          {activeSettingsTab === 'edibles' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="edibles_show_dosage"
                    checked={localSettings.edibles_show_dosage ?? true}
                    onChange={(e) => handleSettingChange('edibles_show_dosage', e.target.checked)}
                    className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                    disabled={saving}
                  />
                  <label htmlFor="edibles_show_dosage" className="text-sm font-apple-semibold text-white">
                    Show Dosage
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="edibles_show_effects"
                    checked={localSettings.edibles_show_effects ?? true}
                    onChange={(e) => handleSettingChange('edibles_show_effects', e.target.checked)}
                    className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                    disabled={saving}
                  />
                  <label htmlFor="edibles_show_effects" className="text-sm font-apple-semibold text-white">
                    Show Effects Flipboard
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="edibles_show_type_headers"
                    checked={localSettings.edibles_show_type_headers ?? true}
                    onChange={(e) => handleSettingChange('edibles_show_type_headers', e.target.checked)}
                    className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                    disabled={saving}
                  />
                  <label htmlFor="edibles_show_type_headers" className="text-sm font-apple-semibold text-white">
                    Show Type Headers
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-apple-semibold text-white mb-3">Dosage Unit</label>
                  <select
                    value={localSettings.edibles_dosage_unit || 'mg'}
                    onChange={(e) => handleSettingChange('edibles_dosage_unit', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-xl rounded-lg text-white border border-white/20 focus:border-emerald-400/50 focus:outline-none transition-all duration-200 font-apple-medium"
                    disabled={saving}
                  >
                    <option value="mg">Milligrams (mg)</option>
                    <option value="g">Grams (g)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-apple-semibold text-white mb-3">Group Products By</label>
                  <select
                    value={localSettings.edibles_group_by || 'type'}
                    onChange={(e) => handleSettingChange('edibles_group_by', e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 backdrop-blur-xl rounded-lg text-white border border-white/20 focus:border-emerald-400/50 focus:outline-none transition-all duration-200 font-apple-medium"
                    disabled={saving}
                  >
                    <option value="type">Product Type (Cookies/Gummies/Moonwater)</option>
                    <option value="dosage">Dosage</option>
                    <option value="alphabetical">Alphabetical</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Effects & Animation Settings */}
          {activeSettingsTab === 'effects' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="effects_flipboard_enabled"
                    checked={localSettings.effects_flipboard_enabled ?? true}
                    onChange={(e) => handleSettingChange('effects_flipboard_enabled', e.target.checked)}
                    className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                    disabled={saving}
                  />
                  <label htmlFor="effects_flipboard_enabled" className="text-sm font-apple-semibold text-white">
                    Enable Flipboard Effects
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="effects_page_transitions"
                    checked={localSettings.effects_page_transitions ?? true}
                    onChange={(e) => handleSettingChange('effects_page_transitions', e.target.checked)}
                    className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                    disabled={saving}
                  />
                  <label htmlFor="effects_page_transitions" className="text-sm font-apple-semibold text-white">
                    Page Transitions
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="effects_hover_animations"
                    checked={localSettings.effects_hover_animations ?? true}
                    onChange={(e) => handleSettingChange('effects_hover_animations', e.target.checked)}
                    className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                    disabled={saving}
                  />
                  <label htmlFor="effects_hover_animations" className="text-sm font-apple-semibold text-white">
                    Hover Animations
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="effects_background_animation"
                    checked={localSettings.effects_background_animation ?? false}
                    onChange={(e) => handleSettingChange('effects_background_animation', e.target.checked)}
                    className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                    disabled={saving}
                  />
                  <label htmlFor="effects_background_animation" className="text-sm font-apple-semibold text-white">
                    Background Animation
                  </label>
                </div>
              </div>

              {localSettings.effects_flipboard_enabled && (
                <div>
                  <label className="block text-sm font-apple-semibold text-white mb-3">
                    Flipboard Speed
                    <span className="text-emerald-400 ml-2">{(localSettings.effects_flipboard_speed || 4000) / 1000}s</span>
                  </label>
                  <input
                    type="range"
                    min="2000"
                    max="10000"
                    step="500"
                    value={localSettings.effects_flipboard_speed || 4000}
                    onChange={(e) => handleSettingChange('effects_flipboard_speed', parseInt(e.target.value))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                    disabled={saving}
                  />
                  <div className="flex justify-between text-xs text-white/60 font-apple-medium mt-1">
                    <span>2s</span>
                    <span>4s</span>
                    <span>6s</span>
                    <span>8s</span>
                    <span>10s</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Menu Behavior Settings */}
          {activeSettingsTab === 'behavior' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="menu_auto_refresh"
                    checked={localSettings.menu_auto_refresh ?? true}
                    onChange={(e) => handleSettingChange('menu_auto_refresh', e.target.checked)}
                    className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                    disabled={saving}
                  />
                  <label htmlFor="menu_auto_refresh" className="text-sm font-apple-semibold text-white">
                    Auto Refresh Menu
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="menu_show_out_of_stock"
                    checked={localSettings.menu_show_out_of_stock ?? false}
                    onChange={(e) => handleSettingChange('menu_show_out_of_stock', e.target.checked)}
                    className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                    disabled={saving}
                  />
                  <label htmlFor="menu_show_out_of_stock" className="text-sm font-apple-semibold text-white">
                    Show Out of Stock
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="menu_highlight_new"
                    checked={localSettings.menu_highlight_new ?? true}
                    onChange={(e) => handleSettingChange('menu_highlight_new', e.target.checked)}
                    className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                    disabled={saving}
                  />
                  <label htmlFor="menu_highlight_new" className="text-sm font-apple-semibold text-white">
                    Highlight New Products
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="feature_font_size_control"
                    checked={localSettings.feature_font_size_control ?? true}
                    onChange={(e) => handleSettingChange('feature_font_size_control', e.target.checked)}
                    className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                    disabled={saving}
                  />
                  <label htmlFor="feature_font_size_control" className="text-sm font-apple-semibold text-white">
                    Show Font Size Control
                  </label>
                </div>

                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    id="feature_navigation_menu"
                    checked={localSettings.feature_navigation_menu ?? true}
                    onChange={(e) => handleSettingChange('feature_navigation_menu', e.target.checked)}
                    className="w-5 h-5 rounded bg-white/20 border-white/30 text-emerald-400 focus:ring-emerald-400 focus:ring-2"
                    disabled={saving}
                  />
                  <label htmlFor="feature_navigation_menu" className="text-sm font-apple-semibold text-white">
                    Show Navigation Menu
                  </label>
                </div>
              </div>

              {localSettings.menu_auto_refresh && (
                <div>
                  <label className="block text-sm font-apple-semibold text-white mb-3">
                    Refresh Interval
                    <span className="text-emerald-400 ml-2">{localSettings.menu_refresh_interval || 30}s</span>
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="300"
                    step="10"
                    value={localSettings.menu_refresh_interval || 30}
                    onChange={(e) => handleSettingChange('menu_refresh_interval', parseInt(e.target.value))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                    disabled={saving}
                  />
                  <div className="flex justify-between text-xs text-white/60 font-apple-medium mt-1">
                    <span>10s</span>
                    <span>30s</span>
                    <span>1min</span>
                    <span>3min</span>
                    <span>5min</span>
                  </div>
                </div>
              )}

              {localSettings.menu_highlight_new && (
                <div>
                  <label className="block text-sm font-apple-semibold text-white mb-3">
                    New Product Days
                    <span className="text-emerald-400 ml-2">{localSettings.menu_new_product_days || 7} days</span>
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="30"
                    step="1"
                    value={localSettings.menu_new_product_days || 7}
                    onChange={(e) => handleSettingChange('menu_new_product_days', parseInt(e.target.value))}
                    className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
                    disabled={saving}
                  />
                  <div className="flex justify-between text-xs text-white/60 font-apple-medium mt-1">
                    <span>1d</span>
                    <span>7d</span>
                    <span>14d</span>
                    <span>21d</span>
                    <span>30d</span>
                  </div>
                </div>
              )}

              <div className="border-t border-white/10 pt-6">
                <h4 className="text-lg font-apple-bold text-white mb-4">Custom Messages</h4>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-apple-semibold text-white mb-2">No Products Message</label>
                    <input
                      type="text"
                      value={localSettings.message_no_products || 'Check back soon for updates!'}
                      onChange={(e) => handleSettingChange('message_no_products', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-xl rounded-lg text-white border border-white/20 focus:border-emerald-400/50 focus:outline-none transition-all duration-200 font-apple-medium"
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-apple-semibold text-white mb-2">Loading Message</label>
                    <input
                      type="text"
                      value={localSettings.message_loading || 'Loading menu...'}
                      onChange={(e) => handleSettingChange('message_loading', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-xl rounded-lg text-white border border-white/20 focus:border-emerald-400/50 focus:outline-none transition-all duration-200 font-apple-medium"
                      disabled={saving}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-apple-semibold text-white mb-2">Error Message</label>
                    <input
                      type="text"
                      value={localSettings.message_error || 'Unable to load menu'}
                      onChange={(e) => handleSettingChange('message_error', e.target.value)}
                      className="w-full px-4 py-3 bg-white/10 backdrop-blur-xl rounded-lg text-white border border-white/20 focus:border-emerald-400/50 focus:outline-none transition-all duration-200 font-apple-medium"
                      disabled={saving}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Save Indicator */}
      {saving && (
        <div className="fixed bottom-4 right-4 bg-emerald-600/90 backdrop-blur-xl text-white px-4 py-2 rounded-lg shadow-lg border border-emerald-400/30">
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span className="font-apple-medium">Saving...</span>
          </div>
        </div>
      )}
    </div>
  )
}

// Add Product Modal (simplified version)
function AddProductModal({
  category,
  onAdd,
  onClose,
  saving
}: {
  category: string
  onAdd: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onClose: () => void
  saving: boolean
}) {
  const getTypesByCategory = (cat: string) => {
    switch (cat) {
      case 'flower': return ['indica', 'sativa', 'hybrid']
      case 'vapes': return ['indica', 'sativa', 'hybrid']
      case 'edibles': return ['cookie', 'gummy', 'moonwater']
      default: return []
    }
  }

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    type: getTypesByCategory(category)[0] || '',
    category: category,
    thca: '',
    dosage: '',
    terpenes: '',
    effects: '',
    price: '$0',
    in_stock: true,
    sort_order: 0
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name) {
      alert('Please fill in the product name')
      return
    }

    const productData = {
      name: formData.name,
      category: formData.category as 'flower' | 'vapes' | 'edibles',
      type: formData.type,
      description: formData.description,
      price: formData.price,
      in_stock: formData.in_stock,
      sort_order: formData.sort_order,
      // Category-specific fields
      ...(category === 'flower' && {
        thca: formData.thca,
        terpenes: formData.terpenes ? formData.terpenes.split(',').map(t => t.trim()) : [],
        effects: formData.effects ? formData.effects.split(',').map(e => e.trim()) : []
      }),
      ...(category === 'vapes' && {
        thca: formData.thca,
        terpenes: formData.terpenes ? formData.terpenes.split(',').map(t => t.trim()) : [],
        effects: formData.effects.split(',').map(e => e.trim())
      }),
      ...(category === 'edibles' && {
        dosage: formData.dosage,
        effects: formData.effects ? formData.effects.split(',').map(e => e.trim()) : []
      })
    }

    onAdd(productData)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">Add New {category.charAt(0).toUpperCase() + category.slice(1)}</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white"
              placeholder="Product name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Type *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white"
              required
            >
              {getTypesByCategory(category).map(type => (
                <option key={type} value={type} className="capitalize">
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Price *</label>
            <input
              type="text"
              value={formData.price}
              onChange={(e) => setFormData({...formData, price: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white"
              placeholder="$40"
              required
            />
          </div>

          {category === 'flower' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">THCA %</label>
              <input
                type="text"
                value={formData.thca}
                onChange={(e) => setFormData({...formData, thca: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 rounded text-white"
                placeholder="19%"
              />
            </div>
          )}

          {category === 'edibles' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Dosage</label>
              <input
                type="text"
                value={formData.dosage}
                onChange={(e) => setFormData({...formData, dosage: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 rounded text-white"
                placeholder="100mg"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white resize-none"
              rows={3}
              placeholder="Product description"
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="in_stock"
              checked={formData.in_stock}
              onChange={(e) => setFormData({...formData, in_stock: e.target.checked})}
              className="rounded bg-gray-700"
            />
            <label htmlFor="in_stock" className="text-sm text-gray-300">In Stock</label>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
              disabled={saving}
            >
              {saving ? 'Adding...' : 'Add Product'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Modal Components for Pricing, Specials, and Bundles
function AddPricingRuleModal({
  onAdd,
  onClose,
  saving
}: {
  onAdd: (rule: any) => Promise<void>
  onClose: () => void
  saving: boolean
}) {
  const [formData, setFormData] = useState({
    name: '',
    type: 'percentage_discount',
    value: '',
    category: 'all',
    description: '',
    priority: 1,
    max_uses: '',
    valid_from: '',
    valid_until: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.value) {
      alert('Please fill in required fields')
      return
    }

    onAdd({
      ...formData,
      value: parseFloat(formData.value),
      max_uses: formData.max_uses ? parseInt(formData.max_uses) : null,
      valid_from: formData.valid_from || null,
      valid_until: formData.valid_until || null
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">Add Pricing Rule</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Rule Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white"
              placeholder="Happy Hour 20% Off"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Discount Type *</label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white"
              required
            >
              <option value="percentage_discount">Percentage Off</option>
              <option value="fixed_discount">Fixed Amount Off</option>
              <option value="fixed_price">Set Fixed Price</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">
              Value * {formData.type === 'percentage_discount' ? '(%)' : '($)'}
            </label>
            <input
              type="number"
              value={formData.value}
              onChange={(e) => setFormData({...formData, value: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white"
              placeholder={formData.type === 'percentage_discount' ? '20' : '5.00'}
              min="0"
              step={formData.type === 'percentage_discount' ? '1' : '0.01'}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white"
            >
              <option value="all">All Categories</option>
              <option value="flower">Flower</option>
              <option value="vapes">Vapes</option>
              <option value="edibles">Edibles</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Valid From</label>
              <input
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({...formData, valid_from: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Valid Until</label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 rounded text-white"
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Create Rule'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function PriceCalculatorModal({
  products,
  onClose
}: {
  products: Product[]
  onClose: () => void
}) {
  const [selectedCategory, setSelectedCategory] = useState('flower')
  const [costPrice, setCostPrice] = useState('')
  const [markupPercent, setMarkupPercent] = useState('100')

  const calculatePrice = () => {
    const cost = parseFloat(costPrice)
    const markup = parseFloat(markupPercent)
    if (cost && markup) {
      return (cost * (1 + markup / 100)).toFixed(2)
    }
    return '0.00'
  }

  const calculateMargin = () => {
    const cost = parseFloat(costPrice)
    const markup = parseFloat(markupPercent)
    if (cost && markup) {
      const sellPrice = cost * (1 + markup / 100)
      return ((sellPrice - cost) / sellPrice * 100).toFixed(1)
    }
    return '0.0'
  }

  const categoryProducts = products.filter(p => p.category === selectedCategory)
  const avgPrice = categoryProducts.length > 0 
    ? categoryProducts.reduce((sum, p) => sum + parseFloat(p.price.replace(/[^0-9.]/g, '')), 0) / categoryProducts.length
    : 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold">Price Calculator</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white"
            >
              <option value="flower">Flower</option>
              <option value="vapes">Vapes</option>
              <option value="edibles">Edibles</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Cost Price ($)</label>
              <input
                type="number"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded text-white"
                placeholder="20.00"
                step="0.01"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Markup (%)</label>
              <input
                type="number"
                value={markupPercent}
                onChange={(e) => setMarkupPercent(e.target.value)}
                className="w-full px-3 py-2 bg-gray-700 rounded text-white"
                placeholder="100"
              />
            </div>
          </div>

          <div className="bg-gray-700 rounded-lg p-4 space-y-2">
            <div className="flex justify-between">
              <span>Suggested Sell Price:</span>
              <span className="font-bold text-green-400">${calculatePrice()}</span>
            </div>
            <div className="flex justify-between">
              <span>Profit Margin:</span>
              <span className="font-bold text-blue-400">{calculateMargin()}%</span>
            </div>
            <div className="flex justify-between">
              <span>Category Average:</span>
              <span className="text-gray-300">${avgPrice.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function AddBasePricingModal({
  onAdd,
  onClose,
  saving
}: {
  onAdd: (pricing: Omit<BasePricing, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  onClose: () => void
  saving: boolean
}) {
  const [formData, setFormData] = useState({
    category: 'flower',
    weight_or_quantity: '',
    base_price: '',
    is_active: true
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.weight_or_quantity || !formData.base_price) {
      alert('Please fill in all required fields')
      return
    }

    onAdd({
      category: formData.category,
      weight_or_quantity: formData.weight_or_quantity,
      base_price: parseFloat(formData.base_price),
      is_active: formData.is_active
    })
  }

  const getWeightOptions = (category: string) => {
    switch (category) {
      case 'flower':
        return ['1g', '3.5g', '7g', '14g', '28g']
      case 'concentrates':
        return ['1g', '3.5g', '7g', '14g', '28g']
      case 'vapes':
        return ['1 cart', '2 carts', '3 carts']
      case 'edibles':
        return ['1 pack', '2 packs', '3 packs']
      case 'prerolls':
        return ['1 roll', '3 rolls', '5 rolls']
      case 'moonwater':
        return ['5mg single', '5mg 4-pack', '10mg single', '10mg 4-pack', '30mg single', '30mg 4-pack']
      default:
        return []
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md">
        <h3 className="text-xl font-bold mb-4 text-green-200">Add Base Pricing</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Category *</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value, weight_or_quantity: ''})}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white"
              required
            >
              <option value="flower">Flower</option>
              <option value="concentrates">Concentrates</option>
              <option value="vapes">Vapes</option>
              <option value="edibles">Edibles</option>
              <option value="prerolls">Pre-rolls</option>
              <option value="moonwater">Moonwater</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Weight/Quantity *</label>
            <select
              value={formData.weight_or_quantity}
              onChange={(e) => setFormData({...formData, weight_or_quantity: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white"
              required
            >
              <option value="">Select weight/quantity</option>
              {getWeightOptions(formData.category).map(option => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Base Price ($) *</label>
            <input
              type="number"
              value={formData.base_price}
              onChange={(e) => setFormData({...formData, base_price: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white"
              placeholder="35.00"
              min="0"
              step="0.01"
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="is_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
              className="rounded"
            />
            <label htmlFor="is_active" className="text-sm text-gray-300">Active</label>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 rounded transition-colors"
              disabled={saving}
            >
              {saving ? 'Adding...' : 'Add Pricing'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function AddSpecialModal({
  products,
  onAdd,
  onClose,
  saving
}: {
  products: Product[]
  onAdd: (special: any) => Promise<void>
  onClose: () => void
  saving: boolean
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discount_type: 'percentage',
    value: '',
    category: 'all',
    valid_from: '',
    valid_until: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.value) {
      alert('Please fill in required fields')
      return
    }

    onAdd({
      ...formData,
      value: parseFloat(formData.value),
      valid_from: formData.valid_from || null,
      valid_until: formData.valid_until || null
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4 text-purple-200">Create Special</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Special Name *</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white"
              placeholder="Happy Hour Special"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white resize-none"
              rows={3}
              placeholder="20% off all flower products during happy hour"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Discount Type</label>
              <select
                value={formData.discount_type}
                onChange={(e) => setFormData({...formData, discount_type: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 rounded text-white"
              >
                <option value="percentage">Percentage Off</option>
                <option value="fixed">Fixed Amount Off</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Value * {formData.discount_type === 'percentage' ? '(%)' : '($)'}
              </label>
              <input
                type="number"
                value={formData.value}
                onChange={(e) => setFormData({...formData, value: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 rounded text-white"
                placeholder={formData.discount_type === 'percentage' ? '20' : '5.00'}
                min="0"
                step={formData.discount_type === 'percentage' ? '1' : '0.01'}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({...formData, category: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white"
            >
              <option value="all">All Categories</option>
              <option value="flower">Flower</option>
              <option value="vapes">Vapes</option>
              <option value="edibles">Edibles</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Start Date</label>
              <input
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({...formData, valid_from: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 rounded text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">End Date</label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({...formData, valid_until: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 rounded text-white"
              />
            </div>
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Create Special'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function CreateBundleModal({
  products,
  onAdd,
  onClose,
  saving
}: {
  products: Product[]
  onAdd: (bundle: any) => Promise<void>
  onClose: () => void
  saving: boolean
}) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    bundle_price: '',
    category: 'all'
  })
  const [bundleType, setBundleType] = useState<'specific' | 'category'>('specific')
  const [selectedProducts, setSelectedProducts] = useState<{[key: string]: {weight?: string, quantity?: number}}>({})
  const [categoryRequirements, setCategoryRequirements] = useState<{[key: string]: {quantity: number, weight?: string}}>({})

  const getWeightOptions = (category: string) => {
    if (category === 'flower') {
      return ['1g', '3.5g', '7g', '14g', '28g']
    }
    return []
  }

  const getQuantityOptions = () => {
    return [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
  }

  const getCategoryDisplayName = (category: string) => {
    const names: {[key: string]: string} = {
      'flower': 'Flower',
      'vapes': 'Vapes', 
      'edibles': 'Edibles',
      'concentrates': 'Concentrates',
      'prerolls': 'Pre-rolls'
    }
    return names[category] || category
  }

  const calculateOriginalPrice = () => {
    if (bundleType === 'specific') {
      return Object.keys(selectedProducts).reduce((total, productId) => {
        const product = products.find(p => p.id === productId)
        return total + (product ? parseFloat(product.price.replace(/[^0-9.]/g, '')) : 0)
      }, 0)
    } else {
      // For category-based bundles, estimate based on average prices
      return Object.entries(categoryRequirements).reduce((total, [category, req]) => {
        const categoryProducts = products.filter(p => p.category === category)
        if (categoryProducts.length > 0) {
          const avgPrice = categoryProducts.reduce((sum, p) => sum + parseFloat(p.price.replace(/[^0-9.]/g, '')), 0) / categoryProducts.length
          return total + (avgPrice * req.quantity)
        }
        return total
      }, 0)
    }
  }

  const calculateDiscount = () => {
    const original = calculateOriginalPrice()
    const bundle = parseFloat(formData.bundle_price) || 0
    return original > 0 ? ((original - bundle) / original * 100).toFixed(1) : '0'
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    
    if (bundleType === 'specific') {
      if (!formData.name || !formData.bundle_price || Object.keys(selectedProducts).length === 0) {
        alert('Please fill in required fields and select products')
        return
      }

      onAdd({
        ...formData,
        bundle_type: 'specific',
        products: Object.keys(selectedProducts),
        product_details: selectedProducts,
        bundle_price: parseFloat(formData.bundle_price),
        original_price: calculateOriginalPrice(),
        discount_percentage: parseFloat(calculateDiscount())
      })
    } else {
      if (!formData.name || !formData.bundle_price || Object.keys(categoryRequirements).length === 0) {
        alert('Please fill in required fields and category requirements')
        return
      }

      onAdd({
        ...formData,
        bundle_type: 'category',
        category_requirements: categoryRequirements,
        bundle_price: parseFloat(formData.bundle_price),
        original_price: calculateOriginalPrice(),
        discount_percentage: parseFloat(calculateDiscount())
      })
    }
  }

  const filteredProducts = formData.category === 'all' 
    ? products 
    : products.filter(p => p.category === formData.category)

  const availableCategories = Array.from(new Set(products.map(p => p.category)))

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4 text-amber-200">Create Bundle</h3>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Bundle Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 rounded text-white"
                placeholder="Weekend Special Bundle"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Bundle Price *</label>
              <input
                type="number"
                value={formData.bundle_price}
                onChange={(e) => setFormData({...formData, bundle_price: e.target.value})}
                className="w-full px-3 py-2 bg-gray-700 rounded text-white"
                placeholder="75.00"
                step="0.01"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 bg-gray-700 rounded text-white resize-none"
              rows={2}
              placeholder="Perfect starter bundle with flower, vape, and edible"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Bundle Type</label>
            <div className="flex space-x-4">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="specific"
                  checked={bundleType === 'specific'}
                  onChange={(e) => setBundleType(e.target.value as 'specific' | 'category')}
                  className="text-amber-600"
                />
                <span className="text-gray-300">Specific Products</span>
              </label>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="radio"
                  value="category"
                  checked={bundleType === 'category'}
                  onChange={(e) => setBundleType(e.target.value as 'specific' | 'category')}
                  className="text-amber-600"
                />
                <span className="text-gray-300">Category Based</span>
              </label>
            </div>
          </div>

          {bundleType === 'specific' && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">Filter by Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="w-full px-3 py-2 bg-gray-700 rounded text-white"
                >
                  <option value="all">All Categories</option>
                  <option value="flower">Flower</option>
                  <option value="vapes">Vapes</option>
                  <option value="edibles">Edibles</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Select Products ({Object.keys(selectedProducts).length} selected)
                </label>
                <div className="max-h-48 overflow-y-auto bg-gray-700 rounded p-3 space-y-3">
                  {filteredProducts.map(product => {
                    const isSelected = selectedProducts[product.id]
                    const useWeight = product.category === 'flower'
                    
                    return (
                      <div key={product.id} className="space-y-2">
                        <label className="flex items-center space-x-3 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!isSelected}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProducts({
                                  ...selectedProducts, 
                                  [product.id]: useWeight ? { weight: '3.5g' } : { quantity: 1 }
                                })
                              } else {
                                const newSelected = { ...selectedProducts }
                                delete newSelected[product.id]
                                setSelectedProducts(newSelected)
                              }
                            }}
                            className="rounded bg-gray-600"
                          />
                          <span className="flex-1 font-medium">{product.name}</span>
                          <span className="text-xs text-gray-400 capitalize">{product.category}</span>
                        </label>
                        
                        {isSelected && (
                          <div className="ml-6 flex items-center space-x-2">
                            {useWeight ? (
                              <>
                                <span className="text-sm text-gray-300">Weight:</span>
                                <select
                                  value={isSelected.weight || '3.5g'}
                                  onChange={(e) => setSelectedProducts({
                                    ...selectedProducts,
                                    [product.id]: { weight: e.target.value }
                                  })}
                                  className="px-2 py-1 bg-gray-600 rounded text-white text-sm"
                                >
                                  {getWeightOptions(product.category).map(weight => (
                                    <option key={weight} value={weight}>{weight}</option>
                                  ))}
                                </select>
                              </>
                            ) : (
                              <>
                                <span className="text-sm text-gray-300">Quantity:</span>
                                <select
                                  value={isSelected.quantity || 1}
                                  onChange={(e) => setSelectedProducts({
                                    ...selectedProducts,
                                    [product.id]: { quantity: parseInt(e.target.value) }
                                  })}
                                  className="px-2 py-1 bg-gray-600 rounded text-white text-sm"
                                >
                                  {getQuantityOptions().map(qty => (
                                    <option key={qty} value={qty}>{qty}</option>
                                  ))}
                                </select>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {Object.keys(selectedProducts).length > 0 && (
                <div className="bg-gray-700 rounded-lg p-4">
                  <h4 className="font-semibold mb-2">Bundle Summary</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Original Price:</span>
                      <span>${calculateOriginalPrice().toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Bundle Price:</span>
                      <span className="text-amber-400">${formData.bundle_price || '0.00'}</span>
                    </div>
                    <div className="flex justify-between font-semibold">
                      <span>Customer Saves:</span>
                      <span className="text-green-400">
                        ${(calculateOriginalPrice() - (parseFloat(formData.bundle_price) || 0)).toFixed(2)} ({calculateDiscount()}%)
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {bundleType === 'category' && (
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Category Requirements ({Object.keys(categoryRequirements).length} categories)
              </label>
              <div className="space-y-3">
                {availableCategories.map(category => (
                  <div key={category} className="bg-gray-700 rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!categoryRequirements[category]}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCategoryRequirements({
                                ...categoryRequirements,
                                [category]: { quantity: 1, weight: category === 'flower' ? '3.5g' : undefined }
                              })
                            } else {
                              const newRequirements = { ...categoryRequirements }
                              delete newRequirements[category]
                              setCategoryRequirements(newRequirements)
                            }
                          }}
                          className="rounded bg-gray-600"
                        />
                        <span className="font-medium text-white">{getCategoryDisplayName(category)}</span>
                      </label>
                    </div>
                    
                    {categoryRequirements[category] && (
                      <div className="ml-6 space-y-2">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm text-gray-300">Quantity:</span>
                          <select
                            value={categoryRequirements[category].quantity}
                            onChange={(e) => setCategoryRequirements({
                              ...categoryRequirements,
                              [category]: { 
                                ...categoryRequirements[category], 
                                quantity: parseInt(e.target.value) 
                              }
                            })}
                            className="px-2 py-1 bg-gray-600 rounded text-white text-sm"
                          >
                            {getQuantityOptions().map(qty => (
                              <option key={qty} value={qty}>{qty}</option>
                            ))}
                          </select>
                        </div>
                        
                        {category === 'flower' && (
                          <div className="flex items-center space-x-2">
                            <span className="text-sm text-gray-300">Weight per item:</span>
                            <select
                              value={categoryRequirements[category].weight || '3.5g'}
                              onChange={(e) => setCategoryRequirements({
                                ...categoryRequirements,
                                [category]: { 
                                  ...categoryRequirements[category], 
                                  weight: e.target.value 
                                }
                              })}
                              className="px-2 py-1 bg-gray-600 rounded text-white text-sm"
                            >
                              {getWeightOptions(category).map(weight => (
                                <option key={weight} value={weight}>{weight}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        
                        <div className="text-xs text-gray-400">
                          Example: "Any {categoryRequirements[category].quantity} {getCategoryDisplayName(category).toLowerCase()} item{categoryRequirements[category].quantity > 1 ? 's' : ''}"
                          {categoryRequirements[category].weight && ` (${categoryRequirements[category].weight} each)`}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {((bundleType === 'specific' && Object.keys(selectedProducts).length > 0) || 
            (bundleType === 'category' && Object.keys(categoryRequirements).length > 0)) && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-semibold mb-2">Bundle Summary</h4>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Estimated Original Price:</span>
                  <span>${calculateOriginalPrice().toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Bundle Price:</span>
                  <span className="text-amber-400">${formData.bundle_price || '0.00'}</span>
                </div>
                <div className="flex justify-between font-semibold">
                  <span>Customer Saves:</span>
                  <span className="text-green-400">
                    ${(calculateOriginalPrice() - (parseFloat(formData.bundle_price) || 0)).toFixed(2)} ({calculateDiscount()}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 rounded transition-colors"
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Create Bundle'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
} 