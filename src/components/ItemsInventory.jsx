import React, { useState, useMemo } from 'react';
import { 
  Package, 
  Search, 
  Plus, 
  AlertTriangle, 
  TrendingUp, 
  Layers, 
  Edit3, 
  Trash2, 
  ArrowUpRight, 
  ArrowDownRight, 
  X, 
  Check, 
  Boxes,
  DollarSign
} from 'lucide-react';
import { ITEM_CATEGORIES } from '../data/initialData';
import { showAppAlert, showAppConfirm } from '../utils/dialog';

export default function ItemsInventory({ items = [], onUpdateItems }) {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'low_stock', 'out_of_stock'
  
  // Modal states
  const [isAddEditOpen, setIsAddEditOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [stockAdjustItem, setStockAdjustItem] = useState(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustType, setAdjustType] = useState('add'); // 'add' or 'subtract'
  const [adjustReason, setAdjustReason] = useState('Restock purchase');

  // Form state for Add/Edit
  const [formData, setFormData] = useState({
    name: '',
    category: 'Boxes & Pralines',
    salePrice: '',
    purchasePrice: '',
    stock: '',
    unit: 'Boxes',
    minStock: 5,
    code: ''
  });

  // Calculate high-level inventory statistics
  const stats = useMemo(() => {
    let totalValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    items.forEach(item => {
      const stock = Number(item.stock) || 0;
      const cost = Number(item.purchasePrice) || 0;
      totalValue += stock * cost;

      if (stock === 0) {
        outOfStockCount++;
      } else if (stock <= (Number(item.minStock) || 5)) {
        lowStockCount++;
      }
    });

    return {
      totalItems: items.length,
      totalValue,
      lowStockCount,
      outOfStockCount
    };
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = 
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        (item.code && item.code.toLowerCase().includes(search.toLowerCase())) ||
        (item.category && item.category.toLowerCase().includes(search.toLowerCase()));

      const matchesCat = selectedCategory === 'All' || item.category === selectedCategory;

      const stock = Number(item.stock) || 0;
      const minStock = Number(item.minStock) || 5;

      let matchesStockMode = true;
      if (filterMode === 'low_stock') {
        matchesStockMode = stock > 0 && stock <= minStock;
      } else if (filterMode === 'out_of_stock') {
        matchesStockMode = stock === 0;
      }

      return matchesSearch && matchesCat && matchesStockMode;
    });
  }, [items, search, selectedCategory, filterMode]);

  // Open modal for Create
  const handleOpenAdd = () => {
    setEditingItem(null);
    setFormData({
      name: '',
      category: ITEM_CATEGORIES[1] || 'Boxes & Pralines',
      salePrice: '',
      purchasePrice: '',
      stock: '',
      unit: 'Boxes',
      minStock: 5,
      code: ''
    });
    setIsAddEditOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category || 'Boxes & Pralines',
      salePrice: item.salePrice,
      purchasePrice: item.purchasePrice,
      stock: item.stock,
      unit: item.unit || 'Boxes',
      minStock: item.minStock || 5,
      code: item.code || ''
    });
    setIsAddEditOpen(true);
  };

  // Save Add/Edit
  const handleSaveItem = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      showAppAlert({
        title: 'Item Name Required',
        message: 'Please enter an item name.',
        type: 'warning'
      });
      return;
    }

    const salePriceNum = Number(formData.salePrice) || 0;
    const purchasePriceNum = Number(formData.purchasePrice) || 0;
    const stockNum = Number(formData.stock) || 0;
    const minStockNum = Number(formData.minStock) || 5;

    if (editingItem) {
      const updated = items.map(it => it.id === editingItem.id ? {
        ...it,
        ...formData,
        salePrice: salePriceNum,
        purchasePrice: purchasePriceNum,
        stock: stockNum,
        minStock: minStockNum
      } : it);
      onUpdateItems(updated);
    } else {
      const newItem = {
        id: 'itm_' + Date.now(),
        ...formData,
        salePrice: salePriceNum,
        purchasePrice: purchasePriceNum,
        stock: stockNum,
        minStock: minStockNum,
        code: formData.code.trim() || 'ITM-' + Math.floor(100 + Math.random() * 900)
      };
      onUpdateItems([newItem, ...items]);
    }

    setIsAddEditOpen(false);
  };

  // Delete Item
  const handleDeleteItem = (item) => {
    showAppConfirm({
      title: 'Delete Item?',
      message: `Are you sure you want to delete "${item.name}" from inventory?`,
      confirmText: 'Delete Item',
      confirmStyle: 'danger',
      onConfirm: () => {
        onUpdateItems(items.filter(it => it.id !== item.id));
      }
    });
  };

  // Apply Quick Stock Adjustment
  const handleApplyStockAdjustment = (e) => {
    e.preventDefault();
    const qtyNum = Number(adjustQty);
    if (!qtyNum || qtyNum <= 0) {
      showAppAlert({
        title: 'Invalid Quantity',
        message: 'Please enter a valid positive quantity to adjust.',
        type: 'warning'
      });
      return;
    }

    const updated = items.map(it => {
      if (it.id !== stockAdjustItem.id) return it;
      const current = Number(it.stock) || 0;
      const newStock = adjustType === 'add' ? current + qtyNum : Math.max(0, current - qtyNum);
      return { ...it, stock: newStock };
    });

    onUpdateItems(updated);
    setStockAdjustItem(null);
    setAdjustQty('');
  };

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '16px 14px 80px 14px' }}>
      
      {/* Top Banner & Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ padding: '8px', borderRadius: '12px', background: 'rgba(226, 178, 101, 0.15)', border: '1px solid var(--gold-border)' }}>
              <Boxes size={20} color="var(--gold-primary)" />
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: '20px', fontWeight: '800', color: 'var(--gold-light)' }}>
                Vyapar Stock Inventory
              </h1>
              <p style={{ margin: '2px 0 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>
                Manage chocolate catalog, stock quantities, and buying vs selling margins
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            background: 'linear-gradient(135deg, #e2b265, #ba8339)',
            color: '#120904',
            border: 'none',
            borderRadius: '12px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: '800',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(226, 178, 101, 0.25)'
          }}
        >
          <Plus size={16} strokeWidth={2.8} />
          <span>Add New Item</span>
        </button>
      </div>

      {/* KPI Cards Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px', marginBottom: '18px' }}>
        {/* Total Stock Value */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(35, 20, 14, 0.8), rgba(20, 11, 7, 0.95))',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Total Stock Value
            </span>
            <DollarSign size={15} color="var(--gold-primary)" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: '900', color: 'var(--gold-light)' }}>
            Rs. {stats.totalValue.toLocaleString()}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Cost price valuation
          </div>
        </div>

        {/* Total Products */}
        <div style={{
          background: 'linear-gradient(145deg, rgba(35, 20, 14, 0.8), rgba(20, 11, 7, 0.95))',
          border: '1px solid var(--border-subtle)',
          borderRadius: '14px',
          padding: '14px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Catalog Items
            </span>
            <Package size={15} color="#60a5fa" />
          </div>
          <div style={{ fontSize: '20px', fontWeight: '900', color: '#f3f4f6' }}>
            {stats.totalItems} Items
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
            Active product listings
          </div>
        </div>

        {/* Low Stock Alert */}
        <div 
          onClick={() => setFilterMode(filterMode === 'low_stock' ? 'all' : 'low_stock')}
          style={{
            background: stats.lowStockCount > 0 
              ? 'linear-gradient(145deg, rgba(245, 158, 11, 0.15), rgba(20, 11, 7, 0.95))' 
              : 'linear-gradient(145deg, rgba(35, 20, 14, 0.8), rgba(20, 11, 7, 0.95))',
            border: stats.lowStockCount > 0 ? '1px solid rgba(245, 158, 11, 0.4)' : '1px solid var(--border-subtle)',
            borderRadius: '14px',
            padding: '14px',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: stats.lowStockCount > 0 ? '#fbbf24' : 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Low Stock Alerts
            </span>
            <AlertTriangle size={15} color={stats.lowStockCount > 0 ? '#fbbf24' : 'var(--text-dim)'} />
          </div>
          <div style={{ fontSize: '20px', fontWeight: '900', color: stats.lowStockCount > 0 ? '#fbbf24' : '#10b981' }}>
            {stats.lowStockCount} {stats.lowStockCount === 1 ? 'Item' : 'Items'}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-dim)', marginTop: '4px' }}>
            {stats.lowStockCount > 0 ? 'Tap to filter low stock' : 'Stock levels healthy'}
          </div>
        </div>
      </div>

      {/* Search & Stock Filter Buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '14px' }}>
        <div style={{ position: 'relative' }}>
          <Search size={16} color="var(--text-muted)" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search chocolates by name, code or category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: '100%',
              background: 'rgba(20, 11, 7, 0.85)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '12px',
              padding: '11px 14px 11px 40px',
              color: 'var(--text-main)',
              fontSize: '13px',
              boxSizing: 'border-box'
            }}
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer'
              }}
            >
              <X size={15} />
            </button>
          )}
        </div>

        {/* Category Pills Bar */}
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          {ITEM_CATEGORIES.map(cat => {
            const isSelected = selectedCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  whiteSpace: 'nowrap',
                  padding: '6px 12px',
                  borderRadius: '20px',
                  border: isSelected ? '1px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
                  background: isSelected ? 'rgba(226, 178, 101, 0.2)' : 'rgba(25, 14, 9, 0.7)',
                  color: isSelected ? 'var(--gold-light)' : 'var(--text-muted)',
                  fontSize: '12px',
                  fontWeight: isSelected ? '700' : '500',
                  cursor: 'pointer'
                }}
              >
                {cat}
              </button>
            );
          })}
        </div>

        {/* Quick Filter: All vs Low Stock */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            type="button"
            onClick={() => setFilterMode('all')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '10px',
              border: filterMode === 'all' ? '1px solid var(--gold-primary)' : '1px solid var(--border-subtle)',
              background: filterMode === 'all' ? 'rgba(226, 178, 101, 0.15)' : 'transparent',
              color: filterMode === 'all' ? 'var(--gold-light)' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            All Items ({items.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('low_stock')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '10px',
              border: filterMode === 'low_stock' ? '1px solid #fbbf24' : '1px solid var(--border-subtle)',
              background: filterMode === 'low_stock' ? 'rgba(245, 158, 11, 0.2)' : 'transparent',
              color: filterMode === 'low_stock' ? '#fbbf24' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            ⚠️ Low Stock ({stats.lowStockCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode('out_of_stock')}
            style={{
              flex: 1,
              padding: '8px',
              borderRadius: '10px',
              border: filterMode === 'out_of_stock' ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
              background: filterMode === 'out_of_stock' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
              color: filterMode === 'out_of_stock' ? '#f87171' : 'var(--text-muted)',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Out of Stock ({stats.outOfStockCount})
          </button>
        </div>
      </div>

      {/* Items List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {filteredItems.length === 0 ? (
          <div style={{
            background: 'rgba(20, 11, 7, 0.6)',
            borderRadius: '14px',
            border: '1px dashed var(--border-subtle)',
            padding: '36px 20px',
            textAlign: 'center',
            color: 'var(--text-muted)'
          }}>
            <Package size={36} color="var(--text-dim)" style={{ marginBottom: '8px' }} />
            <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--text-main)' }}>No Items Found</div>
            <div style={{ fontSize: '12px', marginTop: '4px' }}>Try adjusting your search query or filter category.</div>
          </div>
        ) : (
          filteredItems.map(item => {
            const stock = Number(item.stock) || 0;
            const minStock = Number(item.minStock) || 5;
            const salePrice = Number(item.salePrice) || 0;
            const purchasePrice = Number(item.purchasePrice) || 0;
            const profit = salePrice - purchasePrice;
            const marginPct = salePrice > 0 ? Math.round((profit / salePrice) * 100) : 0;

            const isOutOfStock = stock === 0;
            const isLowStock = !isOutOfStock && stock <= minStock;

            return (
              <div
                key={item.id}
                style={{
                  background: 'linear-gradient(145deg, rgba(30, 17, 11, 0.85), rgba(18, 10, 6, 0.95))',
                  borderRadius: '14px',
                  border: isLowStock 
                    ? '1px solid rgba(245, 158, 11, 0.4)' 
                    : isOutOfStock 
                    ? '1px solid rgba(239, 68, 68, 0.4)' 
                    : '1px solid var(--border-subtle)',
                  padding: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
              >
                {/* Header Row */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '15px', fontWeight: '800', color: 'var(--gold-light)' }}>
                        {item.name}
                      </span>
                      {item.code && (
                        <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.08)', padding: '2px 6px', borderRadius: '6px', color: 'var(--text-muted)' }}>
                          {item.code}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                      Category: <span style={{ color: 'var(--text-main)', fontWeight: '600' }}>{item.category || 'General'}</span>
                    </div>
                  </div>

                  {/* Stock Status Badge */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: '800',
                    background: isOutOfStock 
                      ? 'rgba(239, 68, 68, 0.2)' 
                      : isLowStock 
                      ? 'rgba(245, 158, 11, 0.2)' 
                      : 'rgba(16, 185, 129, 0.15)',
                    color: isOutOfStock 
                      ? '#f87171' 
                      : isLowStock 
                      ? '#fbbf24' 
                      : '#34d399',
                    border: isOutOfStock
                      ? '1px solid rgba(239, 68, 68, 0.3)'
                      : isLowStock
                      ? '1px solid rgba(245, 158, 11, 0.3)'
                      : '1px solid rgba(16, 185, 129, 0.3)'
                  }}>
                    {isOutOfStock ? (
                      <span>Out of Stock</span>
                    ) : (
                      <span>{stock} {item.unit || 'Units'}</span>
                    )}
                  </div>
                </div>

                {/* Pricing & Margins Grid */}
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(3, 1fr)', 
                  gap: '6px', 
                  background: 'rgba(12, 6, 3, 0.6)', 
                  padding: '8px 12px', 
                  borderRadius: '10px' 
                }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Sale Price</div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: '#60a5fa' }}>
                      Rs. {salePrice.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Purchase Cost</div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: 'var(--text-dim)' }}>
                      Rs. {purchasePrice.toLocaleString()}
                    </div>
                  </div>

                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Profit Margin</div>
                    <div style={{ fontSize: '14px', fontWeight: '800', color: profit >= 0 ? '#10b981' : '#ef4444', display: 'flex', alignItems: 'center', gap: '2px' }}>
                      {profit >= 0 ? '+' : ''}Rs. {profit.toLocaleString()}
                      <span style={{ fontSize: '10px', opacity: 0.85 }}>({marginPct}%)</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Actions Row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                  
                  {/* Quick Adjust Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setStockAdjustItem(item);
                      setAdjustQty('');
                      setAdjustType('add');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      background: 'rgba(226, 178, 101, 0.12)',
                      border: '1px solid var(--gold-border)',
                      borderRadius: '8px',
                      padding: '5px 10px',
                      color: 'var(--gold-light)',
                      fontSize: '11px',
                      fontWeight: '700',
                      cursor: 'pointer'
                    }}
                  >
                    <TrendingUp size={13} />
                    <span>Adjust Stock</span>
                  </button>

                  {/* Edit & Delete Buttons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(item)}
                      title="Edit Item Details"
                      style={{
                        padding: '6px 10px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.06)',
                        border: '1px solid var(--border-subtle)',
                        color: 'var(--text-main)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '11px',
                        fontWeight: '600'
                      }}
                    >
                      <Edit3 size={13} />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteItem(item)}
                      title="Delete Item"
                      style={{
                        padding: '6px 8px',
                        borderRadius: '8px',
                        background: 'rgba(239, 68, 68, 0.12)',
                        border: '1px solid rgba(239, 68, 68, 0.25)',
                        color: '#f87171',
                        cursor: 'pointer'
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ADD / EDIT ITEM MODAL */}
      {isAddEditOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 60,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#190e09',
            border: '1px solid var(--gold-border)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '500px',
            padding: '20px',
            maxHeight: '90vh',
            overflowY: 'auto',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={20} color="var(--gold-primary)" />
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: 'var(--gold-light)' }}>
                  {editingItem ? 'Edit Item' : 'Add New Inventory Item'}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsAddEditOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveItem} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Item / Chocolate Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ferrero Rocher T24 Box"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(20, 11, 7, 0.9)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '10px',
                    color: '#fff',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(20, 11, 7, 0.9)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  >
                    {ITEM_CATEGORIES.filter(c => c !== 'All').map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Unit of Measurement
                  </label>
                  <select
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(20, 11, 7, 0.9)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value="Boxes">Boxes</option>
                    <option value="Bars">Bars</option>
                    <option value="Packs">Packs</option>
                    <option value="Hampers">Hampers</option>
                    <option value="Jars">Jars</option>
                    <option value="Cartons">Cartons</option>
                    <option value="Pcs">Pcs</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#60a5fa', display: 'block', marginBottom: '4px' }}>
                    Selling Price (Rs.) *
                  </label>
                  <input
                    type="number"
                    required
                    min="0"
                    placeholder="e.g. 3450"
                    value={formData.salePrice}
                    onChange={(e) => setFormData({ ...formData, salePrice: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(20, 11, 7, 0.9)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Purchase Cost (Rs.)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 2800"
                    value={formData.purchasePrice}
                    onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(20, 11, 7, 0.9)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Current Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="e.g. 24"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(20, 11, 7, 0.9)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                    Low Stock Alert Level
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="e.g. 5"
                    value={formData.minStock}
                    onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                    style={{
                      width: '100%',
                      background: 'rgba(20, 11, 7, 0.9)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '10px',
                      color: '#fff',
                      fontSize: '13px',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Item SKU / Code (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. FR-T24"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  style={{
                    width: '100%',
                    background: 'rgba(20, 11, 7, 0.9)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '10px',
                    color: '#fff',
                    fontSize: '13px',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                <button
                  type="button"
                  onClick={() => setIsAddEditOpen(false)}
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    fontSize: '13px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'linear-gradient(135deg, #e2b265, #ba8339)',
                    border: 'none',
                    color: '#120904',
                    fontSize: '13px',
                    fontWeight: '800',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(226, 178, 101, 0.3)'
                  }}
                >
                  {editingItem ? 'Save Changes' : 'Create Item'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK STOCK ADJUSTMENT MODAL */}
      {stockAdjustItem && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 60,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '16px'
        }}>
          <div style={{
            background: '#190e09',
            border: '1px solid var(--gold-border)',
            borderRadius: '16px',
            width: '100%',
            maxWidth: '440px',
            padding: '20px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: 'var(--gold-light)' }}>
                Adjust Stock: {stockAdjustItem.name}
              </h3>
              <button
                type="button"
                onClick={() => setStockAdjustItem(null)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '10px', marginBottom: '14px', fontSize: '12px', color: 'var(--text-muted)' }}>
              Current stock on hand: <strong style={{ color: 'var(--gold-light)' }}>{stockAdjustItem.stock} {stockAdjustItem.unit || 'Units'}</strong>
            </div>

            <form onSubmit={handleApplyStockAdjustment} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setAdjustType('add')}
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    border: adjustType === 'add' ? '1px solid #10b981' : '1px solid var(--border-subtle)',
                    background: adjustType === 'add' ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    color: adjustType === 'add' ? '#34d399' : 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <ArrowUpRight size={15} />
                  <span>Stock In (+)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdjustType('subtract')}
                  style={{
                    padding: '10px',
                    borderRadius: '10px',
                    border: adjustType === 'subtract' ? '1px solid #ef4444' : '1px solid var(--border-subtle)',
                    background: adjustType === 'subtract' ? 'rgba(239, 68, 68, 0.2)' : 'transparent',
                    color: adjustType === 'subtract' ? '#f87171' : 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px'
                  }}
                >
                  <ArrowDownRight size={15} />
                  <span>Stock Out (-)</span>
                </button>
              </div>

              <div>
                <label style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
                  Quantity to {adjustType === 'add' ? 'Add' : 'Deduct'} *
                </label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="e.g. 10"
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'rgba(20, 11, 7, 0.9)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '10px',
                    padding: '10px',
                    color: '#fff',
                    fontSize: '14px',
                    fontWeight: '700',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setStockAdjustItem(null)}
                  style={{
                    flex: 1,
                    padding: '10px',
                    borderRadius: '10px',
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid var(--border-subtle)',
                    color: 'var(--text-muted)',
                    fontSize: '12px',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    flex: 2,
                    padding: '10px',
                    borderRadius: '10px',
                    background: adjustType === 'add' ? 'linear-gradient(135deg, #10b981, #059669)' : 'linear-gradient(135deg, #ef4444, #dc2626)',
                    border: 'none',
                    color: '#fff',
                    fontSize: '12px',
                    fontWeight: '800',
                    cursor: 'pointer'
                  }}
                >
                  Confirm Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
