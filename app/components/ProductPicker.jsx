import { useState, useEffect, useRef } from 'react'
import { Search, X, Check } from 'lucide-react'

export default function ProductPicker({ selectedProducts = [], onProductsChange, products = [], collections = [], currencyCode = 'USD' }) {
  const [testType, setTestType] = useState('single')
  const [searchTerm, setSearchTerm] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedGroup, setSelectedGroup] = useState([])
  const [selectionMode, setSelectionMode] = useState('products') // 'products' | 'tags' | 'vendor' | 'type'
  const dropdownRef = useRef(null)
  const [selectedCollection, setSelectedCollection] = useState(null)

  // Transform products to the expected format with full details
  const transformedProducts = products.map(product => ({
    id: product.id,
    title: product.title,
    handle: product.handle,
    sku: product.variants?.[0]?.sku || 'No SKU',
    price: product.price ? parseFloat(product.price) : (product.variants?.[0]?.price ? parseFloat(product.variants[0].price) : 0),
    image: product.image || 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAxOEwzNiAzMEwyNCA0MkwxMiAzMEwyNCAxOFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+',
    category: 'products',
    status: product.status,
    vendor: product.vendor,
    productType: product.productType,
    variants: product.variants || [],
    inventory: product.variants?.[0]?.inventory || 0
  }))

  const productById = new Map(transformedProducts.map(p => [String(p.id), p]))

  // Initialize state based on selectedProducts prop
  useEffect(() => {
    if (selectedProducts.length > 0 && transformedProducts.length > 0) {
      if (selectedProducts.length === 1) {
        setTestType('single')
        setSelectedProduct(selectedProducts[0])
        setSelectedGroup([])
      } else {
        setTestType('grouped')
        setSelectedProduct(null)
        setSelectedGroup(selectedProducts)
      }
    }
    // Only reset to 'single' if we have no selected products AND no products are loaded yet
    // This prevents overriding user's radio button selection
    else if (selectedProducts.length === 0 && transformedProducts.length === 0) {
      setTestType('single')
      setSelectedProduct(null)
      setSelectedGroup([])
    }
  }, [selectedProducts, transformedProducts])

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const filteredProducts = transformedProducts.filter((product) => {
    const term = searchTerm.toLowerCase()
    if (!term) return true
    if (selectionMode === 'products') {
      return (
        product.title.toLowerCase().includes(term) ||
        product.sku.toLowerCase().includes(term) ||
        (Array.isArray(product.tags) ? product.tags.join(',').toLowerCase().includes(term) : false)
      )
    }
    if (selectionMode === 'tags') {
      if (!Array.isArray(product.tags)) return false
      // If searching tags mode with no input, hide results until a tag is chosen
      if (searchTerm.trim() === '') return false
      return product.tags.some(t => String(t).toLowerCase() === term)
    }
    if (selectionMode === 'vendor') {
      return (product.vendor || '').toLowerCase().includes(term)
    }
    if (selectionMode === 'type') {
      return (product.productType || '').toLowerCase().includes(term)
    }
    return true
  })

  const filteredCollections = (collections || []).filter(c =>
    (c.title || '').toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Suggestions by mode
  // Build counts for richer suggestions
  const tagCount = new Map()
  const vendorCount = new Map()
  const typeCount = new Map()
  transformedProducts.forEach(p => {
    if (Array.isArray(p.tags)) {
      p.tags.forEach(t => {
        const key = String(t)
        tagCount.set(key, (tagCount.get(key) || 0) + 1)
      })
    }
    if (p.vendor) vendorCount.set(p.vendor, (vendorCount.get(p.vendor) || 0) + 1)
    if (p.productType) typeCount.set(p.productType, (typeCount.get(p.productType) || 0) + 1)
  })

  const getModeSuggestions = () => {
    const term = searchTerm.toLowerCase()
    if (selectionMode === 'tags') {
      return Array.from(tagCount.entries())
        .filter(([tag]) => tag.toLowerCase().includes(term))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([value, count]) => ({ value, count, kind: 'Tag' }))
    }
    if (selectionMode === 'vendor') {
      return Array.from(vendorCount.entries())
        .filter(([v]) => v.toLowerCase().includes(term))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([value, count]) => ({ value, count, kind: 'Vendor' }))
    }
    if (selectionMode === 'type') {
      return Array.from(typeCount.entries())
        .filter(([t]) => t.toLowerCase().includes(term))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)
        .map(([value, count]) => ({ value, count, kind: 'Type' }))
    }
    if (selectionMode === 'collection') {
      return filteredCollections
        .slice(0, 8)
        .map(c => ({ value: c.title, count: (c.productIds || []).length, kind: 'Collection' }))
    }
    return []
  }

  // Helper: return products for a group value based on current selection mode
  const getProductsForGroup = (mode, value) => {
    const v = String(value || '').toLowerCase()
    if (!v) return []
    if (mode === 'vendor') {
      return transformedProducts.filter(p => (p.vendor || '').toLowerCase() === v)
    }
    if (mode === 'type') {
      return transformedProducts.filter(p => (p.productType || '').toLowerCase() === v)
    }
    if (mode === 'tags') {
      return transformedProducts.filter(p => Array.isArray(p.tags) && p.tags.some(t => String(t).toLowerCase() === v))
    }
    return []
  }

  const handleSingleProductSelect = (product) => {
    setSelectedProduct(product)
    setIsOpen(false)
    setSearchTerm('')
    onProductsChange([product])
  }

  const handleGroupProductToggle = (product) => {
    const isSelected = selectedGroup.some((p) => p.id === product.id)
    let newGroup
    if (isSelected) {
      newGroup = selectedGroup.filter((p) => p.id !== product.id)
    } else {
      newGroup = [...selectedGroup, product]
    }
    setSelectedGroup(newGroup)
    onProductsChange(newGroup)
  }

  const removeFromGroup = (productId) => {
    const newGroup = selectedGroup.filter((p) => p.id !== productId)
    setSelectedGroup(newGroup)
    onProductsChange(newGroup)
  }

  const currencySymbols = { USD: '$', EUR: '€', GBP: '£', INR: '₹', AUD: 'A$', CAD: 'C$', JPY: '¥' }
  const symbol = currencySymbols[currencyCode] || '$'
  const formatPrice = (price) => {
    if (price === undefined || price === null) return `${symbol}0.00`
    const n = typeof price === 'number' ? price : parseFloat(price)
    if (isNaN(n)) return `${symbol}0.00`
    // price may already be dollars; avoid dividing by 100 again if large
    const inDollars = n > 1000 ? n : n / 100
    return `${symbol}${inDollars.toFixed(2)}`
  }



  return (
    <div className="space-y-4">
      {testType === 'grouped' && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">Select by</label>
          <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden bg-white">
            {[
              { key: 'products', label: 'Products' },
              { key: 'collection', label: 'Collection' },
              { key: 'tags', label: 'Tags' },
              { key: 'vendor', label: 'Vendor' },
              { key: 'type', label: 'Product Type' },
            ].map((opt, idx) => (
              <button
                key={opt.key}
                type="button"
                onClick={() => { setSelectionMode(opt.key); setIsOpen(false) }}
                className={`${selectionMode === opt.key ? 'bg-black text-white' : 'bg-white text-gray-700 hover:bg-gray-50'} px-3 py-1.5 text-sm ${idx !== 0 ? 'border-l border-gray-300' : ''}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {null}
      <div className="flex space-x-6">
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="testType"
            value="single"
            checked={testType === 'single'}
            onChange={(e) => setTestType(e.target.value)}
            className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-900">Single Product</span>
        </label>
        <label className="flex items-center cursor-pointer">
          <input
            type="radio"
            name="testType"
            value="grouped"
            checked={testType === 'grouped'}
            onChange={(e) => setTestType(e.target.value)}
            className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-900">Multiple Products</span>
        </label>
      </div>

      {testType === 'single' && (
        <div className="relative" ref={dropdownRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onFocus={() => setIsOpen(true)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
            />
          </div>

          {(isOpen || document.activeElement === undefined) && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {selectionMode === 'collection' ? (
                filteredCollections.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => { setSelectedCollection(c); setIsOpen(false); setSearchTerm(c.title) }}
                    className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{c.title}</p>
                      <p className="text-xs text-gray-500">{(c.productIds || []).length} products</p>
                    </div>
                  </div>
                ))
              ) : (
                filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    onClick={() => handleSingleProductSelect(product)}
                    className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                  >
                    <img
                      src={product.image}
                      alt={product.title}
                      className="w-10 h-10 rounded object-cover mr-3"
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAxMkwyOCAyMEwyMCAyOEwxMiAyMEwyMCAxMloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'
                      }}
                    />
                    <div className="flex-1">
                      <p className="font-medium text-gray-900">{product.title}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {selectionMode === 'tags' && Array.isArray(product.tags) && product.tags.slice(0, 3).map(t => (
                          <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{t}</span>
                        ))}
                        {selectionMode === 'vendor' && product.vendor && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{product.vendor}</span>
                        )}
                        {selectionMode === 'type' && product.productType && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">{product.productType}</span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{formatPrice(product.price)}</p>
                  </div>
                ))
              )}
            </div>
          )}
          {selectedProduct && (
            <div className="mt-4 p-4 border border-gray-200 rounded-lg bg-gray-50">
              <div className="flex items-center space-x-4">
                <img
                  src={selectedProduct.image}
                  alt={selectedProduct.title}
                  className="w-16 h-16 rounded object-cover"
                  onError={(e) => {
                    e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0zMiAyNEw0OCA0MEwzMiA1NkwxNiA0MEwzMiAyNFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'
                  }}
                />
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900">{selectedProduct.title}</h4>
                  <div className="mt-2">
                    <p className="text-lg font-semibold text-gray-900">{formatPrice(selectedProduct.price)}</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {testType === 'grouped' && (
        <div className="space-y-4">
          <div className="relative" ref={dropdownRef}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder={selectionMode === 'collection' ? 'Search collections...' : selectionMode === 'tags' ? 'Search tags...' : selectionMode === 'vendor' ? 'Search vendor...' : selectionMode === 'type' ? 'Search product type...' : 'Search products...'}
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setIsOpen(true) }}
                onFocus={() => setIsOpen(true)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 bg-white"
              />
            </div>

            {isOpen && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <div className="flex items-center justify-between p-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">{selectionMode === 'collection' ? 'Select collection' : 'Select products'} ({selectedGroup.length} selected)</span>
                  <button onClick={() => setIsOpen(false)} className="p-1 text-gray-400 hover:text-gray-600 transition-colors">
                    <X className="h-4 w-4" />
                  </button>
                </div>

                {selectionMode === 'collection' ? (
                  filteredCollections.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCollection(c)
                        const selected = (c.productIds || [])
                          .map(id => productById.get(String(id)))
                          .filter(Boolean)
                        setSelectedGroup(selected)
                        onProductsChange(selected)
                        setIsOpen(false)
                        setSearchTerm(c.title)
                      }}
                      className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                    >
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{c.title}</p>
                        <p className="text-xs text-gray-500">{(c.productIds || []).length} products</p>
                      </div>
                    </div>
                  ))
                ) : (
                  (selectionMode === 'products' ? filteredProducts : []).map((product) => {
                    const isSelected = selectedGroup.some((p) => p.id === product.id)
                    return (
                      <div
                        key={product.id}
                        onClick={() => handleGroupProductToggle(product)}
                        className="flex items-center p-3 hover:bg-gray-50 cursor-pointer"
                      >
                        <div className="flex items-center justify-center w-5 h-5 border border-gray-300 rounded mr-3">
                          {isSelected && <Check className="h-3 w-3 text-blue-600" />}
                        </div>
                        <img
                          src={product.image}
                          alt={product.title}
                          className="w-10 h-10 rounded object-cover mr-3"
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yMCAxMkwyOCAyMEwyMCAyOEwxMiAyMEwyMCAxMloiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'
                          }}
                        />
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{product.title}</p>
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {selectionMode === 'tags' && Array.isArray(product.tags) && product.tags.slice(0, 3).map(t => (
                              <span key={t} className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{t}</span>
                            ))}
                            {selectionMode === 'vendor' && product.vendor && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">{product.vendor}</span>
                            )}
                            {selectionMode === 'type' && product.productType && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-50 text-purple-700">{product.productType}</span>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900">{formatPrice(product.price)}</p>
                        </div>
                      </div>
                    )
                  })
                )}

                {selectionMode !== 'products' && (
                  <>
                    {getModeSuggestions().map((sug) => (
                      <div
                        key={sug.value}
                        className="px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer text-gray-900 flex items-center justify-between"
                        onClick={() => {
                          // Build group selection similar to collection behavior
                          const grouped = getProductsForGroup(selectionMode, sug.value)
                          setSelectedGroup(grouped)
                          onProductsChange(grouped)
                          setIsOpen(false)
                          setSearchTerm(sug.value)
                        }}
                      >
                        <span>{sug.value}</span>
                        <span className="text-[11px] text-gray-500">{sug.kind}{sug.count ? ` • ${sug.count}` : ''}</span>
                      </div>
                    ))}
                    {getModeSuggestions().length === 0 && (
                      <div className="px-3 py-2 text-xs text-gray-500">No suggestions</div>
                    )}
                  </>
                )}

              </div>
            )}
          </div>

          {selectedGroup.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-gray-900">Selected Products ({selectedGroup.length})</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {selectedGroup.map((product) => (
                  <div key={product.id} className="relative p-3 border border-gray-200 rounded-lg bg-gray-50">
                    <button onClick={() => removeFromGroup(product.id)} className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600">
                      <X className="h-4 w-4" />
                    </button>
                    <div className="flex items-center space-x-3">
                      <img
                        src={product.image}
                        alt={product.title}
                        className="w-12 h-12 rounded object-cover"
                        onError={(e) => {
                          e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDgiIGhlaWdodD0iNDgiIHZpZXdCb3g9IjAgMCA0OCA0OCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQ4IiBoZWlnaHQ9IjQ4IiBmaWxsPSIjRjNGNEY2Ii8+CjxwYXRoIGQ9Ik0yNCAxOEwzNiAzMEwyNCA0MkwxMiAzMEwyNCAxOFoiIGZpbGw9IiM5Q0EzQUYiLz4KPC9zdmc+'
                        }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{product.title}</p>
                        <p className="text-xs text-gray-500">{product.sku}</p>
                        <div className="flex items-center space-x-1 mt-1">
                          <span className="text-xs bg-gray-100 text-gray-600 px-1 py-0.5 rounded">{product.status}</span>
                          {product.vendor && <span className="text-xs bg-blue-100 text-blue-600 px-1 py-0.5 rounded">{product.vendor}</span>}
                        </div>
                        <div className="mt-1">
                          <p className="text-sm font-semibold text-gray-900">{formatPrice(product.price)}</p>
                          {product.inventory !== null && (
                            <p className="text-xs text-gray-500">Stock: {product.inventory}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {((testType === 'single' && !selectedProduct) || (testType === 'grouped' && selectedGroup.length === 0)) && (
        <p className="text-sm text-red-600">Please select at least one product to continue.</p>
      )}
    </div>
  )
}


