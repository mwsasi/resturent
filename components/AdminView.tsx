
import React, { useState } from 'react';
import { MenuItem, ItemVariation } from '../types';
import { generateDishImage } from '../services/gemini';

interface AdminViewProps {
  menu: MenuItem[];
  setMenu: (m: MenuItem[]) => void;
}

const AdminView: React.FC<AdminViewProps> = ({ menu, setMenu }) => {
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [adminMode, setAdminMode] = useState<'menu' | 'inventory'>('menu');
  const [hasVariations, setHasVariations] = useState(false);
  
  // State for manual restock inputs
  const [manualInputs, setManualInputs] = useState<Record<string, string>>({});

  const initialFormState: Omit<MenuItem, 'id'> = {
    name: '',
    price: 0,
    category: 'Breakfast',
    image: '',
    description: '',
    stock: 0,
    minStock: 5,
    variations: [],
    piecesPerSet: 1
  };

  const [formData, setFormData] = useState<Omit<MenuItem, 'id'>>(initialFormState);

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: item.price,
      category: item.category,
      image: item.image,
      description: item.description,
      stock: item.stock,
      minStock: item.minStock || 5,
      variations: item.variations || [],
      piecesPerSet: item.piecesPerSet || 1
    });
    setHasVariations(!!item.variations && item.variations.length > 0);
    setIsModalOpen(true);
  };

  const addVariation = () => {
    const newVariation: ItemVariation = {
      id: Date.now().toString() + Math.random(),
      label: '',
      price: 0,
      stock: 0
    };
    setFormData(prev => ({
      ...prev,
      variations: [...(prev.variations || []), newVariation]
    }));
  };

  const removeVariation = (id: string) => {
    setFormData(prev => ({
      ...prev,
      variations: prev.variations?.filter(v => v.id !== id)
    }));
  };

  const updateVariation = (id: string, field: keyof ItemVariation, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      variations: prev.variations?.map(v => v.id === id ? { ...v, [field]: value } : v)
    }));
  };

  const handleQuickRestock = (id: string, amount: number, variationId?: string) => {
    setMenu(menu.map(item => {
      if (item.id === id) {
        if (item.variations && item.variations.length > 0) {
           return {
             ...item,
             variations: item.variations.map(v => {
               if (variationId && v.id !== variationId) return v;
               return { ...v, stock: Math.max(0, v.stock + amount) };
             })
           };
        }
        return { ...item, stock: Math.max(0, item.stock + amount) };
      }
      return item;
    }));
  };

  const handleManualInput = (key: string, value: string) => {
    setManualInputs(prev => ({ ...prev, [key]: value }));
  };

  const applyManualRestock = (itemId: string, direction: 'add' | 'sub', variationId?: string) => {
    const key = variationId ? `${itemId}-${variationId}` : itemId;
    const amount = parseInt(manualInputs[key]);
    if (isNaN(amount) || amount <= 0) return;
    
    handleQuickRestock(itemId, direction === 'add' ? amount : -amount, variationId);
    setManualInputs(prev => ({ ...prev, [key]: '' })); // Clear input after use
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalData = { ...formData };
    if (!hasVariations) {
      finalData.variations = [];
    } else {
      finalData.price = Math.min(...(finalData.variations?.map(v => v.price) || [0]));
    }

    if (editingItem) {
      setMenu(menu.map(i => i.id === editingItem.id ? { ...editingItem, ...finalData } : i));
    } else {
      const newItem: MenuItem = {
        id: Date.now().toString(),
        ...finalData
      };
      setMenu([...menu, newItem]);
    }
    setIsModalOpen(false);
    setEditingItem(null);
    setFormData(initialFormState);
  };

  const openAddModal = () => {
    setEditingItem(null);
    setFormData(initialFormState);
    setHasVariations(false);
    setIsModalOpen(true);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto h-full overflow-y-auto pb-24">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Admin Dashboard</h2>
          <p className="text-slate-500 text-sm">Manage menu items, sizes, and tracking.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex bg-slate-200 p-1 rounded-xl">
             <button onClick={() => setAdminMode('menu')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${adminMode === 'menu' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Edit Menu</button>
             <button onClick={() => setAdminMode('inventory')} className={`px-4 py-2 rounded-lg text-xs font-black transition-all ${adminMode === 'inventory' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>Quick Restock</button>
          </div>
          <button onClick={openAddModal} className="bg-orange-600 text-white px-4 py-2.5 rounded-xl font-black text-xs shadow-lg shadow-orange-100 hover:bg-orange-700 transition-all">New Dish</button>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b">
            <tr>
              <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Dish Information</th>
              <th className={`px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest ${adminMode === 'inventory' ? 'text-left' : 'text-center'}`}>
                {adminMode === 'inventory' ? 'Inventory Control Center' : 'Stock Details'}
              </th>
              {adminMode === 'menu' && <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest">Pricing</th>}
              {adminMode === 'menu' && <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {menu.map(item => {
              const hasSizes = item.variations && item.variations.length > 0;
              return (
                <tr key={item.id} className="hover:bg-slate-50/50 group transition-colors">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden flex items-center justify-center border border-slate-200 shadow-sm">
                        {item.image ? <img src={item.image} className="w-full h-full object-cover" alt="" /> : <span className="font-black text-slate-300">{item.name[0]}</span>}
                      </div>
                      <div>
                        <p className="font-black text-slate-800 text-sm mb-1">{item.name}</p>
                        <div className="flex items-center gap-2">
                           <span className="text-[8px] font-black text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded tracking-widest">{item.category}</span>
                           {item.piecesPerSet && item.piecesPerSet > 1 && (
                             <span className="text-[8px] font-black text-orange-600 uppercase bg-orange-50 px-2 py-0.5 rounded tracking-widest">Set of {item.piecesPerSet}</span>
                           )}
                           {hasSizes && <span className="text-[8px] font-black text-blue-600 uppercase bg-blue-50 px-2 py-0.5 rounded tracking-widest">{item.variations?.length} Sizes</span>}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-8 py-6">
                    {adminMode === 'inventory' ? (
                      <div className="space-y-4">
                        {hasSizes ? (
                          item.variations?.map(v => (
                            <div key={v.id} className="flex flex-wrap items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
                              <div className="min-w-[80px]">
                                <span className="text-[9px] font-black text-slate-400 uppercase block leading-none mb-1">{v.label}</span>
                                <span className={`text-xs font-black ${v.stock <= 5 ? 'text-red-500' : 'text-green-600'}`}>{v.stock} in stock</span>
                              </div>
                              <div className="flex items-center bg-white border border-slate-200 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-orange-100 focus-within:border-orange-500 transition-all">
                                <input type="number" placeholder="0" value={manualInputs[`${item.id}-${v.id}`] || ''} onChange={(e) => handleManualInput(`${item.id}-${v.id}`, e.target.value)} className="w-16 px-3 py-1.5 text-xs font-black outline-none bg-transparent" />
                                <div className="flex border-l border-slate-100">
                                  <button onClick={() => applyManualRestock(item.id, 'add', v.id)} className="px-3 py-1.5 hover:bg-green-50 text-green-600 font-black text-xs border-r border-slate-100">+</button>
                                  <button onClick={() => applyManualRestock(item.id, 'sub', v.id)} className="px-3 py-1.5 hover:bg-red-50 text-red-600 font-black text-xs">-</button>
                                </div>
                              </div>
                              <div className="flex gap-1 ml-auto">
                                <button onClick={() => handleQuickRestock(item.id, 10, v.id)} className="text-[9px] font-black bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">+10</button>
                                <button onClick={() => handleQuickRestock(item.id, 50, v.id)} className="text-[9px] font-black bg-slate-900 text-white px-3 py-1.5 rounded-lg hover:bg-black">+50</button>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="flex flex-wrap items-center gap-4">
                            <div className="bg-slate-50 px-4 py-2 rounded-xl border border-slate-100 min-w-[100px]">
                              <span className="text-[9px] font-black text-slate-400 uppercase block mb-1">Current Stock</span>
                              <span className={`text-sm font-black ${item.stock <= 5 ? 'text-red-500' : 'text-slate-800'}`}>{item.stock} Units</span>
                            </div>
                            <div className="flex items-center bg-white border-2 border-slate-200 rounded-2xl overflow-hidden focus-within:ring-4 focus-within:ring-orange-100 focus-within:border-orange-500 transition-all shadow-sm">
                              <input type="number" placeholder="Manual qty" value={manualInputs[item.id] || ''} onChange={(e) => handleManualInput(item.id, e.target.value)} className="w-24 px-4 py-2 text-sm font-black outline-none bg-transparent" />
                              <div className="flex border-l-2 border-slate-200 h-full">
                                <button onClick={() => applyManualRestock(item.id, 'add')} className="px-5 py-2 hover:bg-green-50 text-green-600 font-black text-sm border-r-2 border-slate-200">ADD</button>
                                <button onClick={() => applyManualRestock(item.id, 'sub')} className="px-5 py-2 hover:bg-red-50 text-red-600 font-black text-sm tracking-tighter">MINUS</button>
                              </div>
                            </div>
                            <div className="flex gap-2 ml-auto">
                               <button onClick={() => handleQuickRestock(item.id, 10)} className="bg-white border-2 border-slate-100 px-5 py-2.5 rounded-xl text-[10px] font-black text-slate-600 hover:border-slate-900 hover:text-slate-900 transition-all">+10 Quick</button>
                               <button onClick={() => handleQuickRestock(item.id, 50)} className="bg-green-600 px-5 py-2.5 rounded-xl text-[10px] font-black text-white hover:bg-green-700 shadow-md shadow-green-100 transition-all">+50 Quick</button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex justify-center">
                        {hasSizes ? (
                          <div className="flex flex-col gap-1 items-center">
                            {item.variations?.map(v => (
                              <span key={v.id} className="text-[9px] font-bold text-slate-500 whitespace-nowrap">
                                {v.label}: <span className={v.stock <= 5 ? 'text-red-500' : 'text-green-600'}>{v.stock}</span>
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className={`px-4 py-2 rounded-xl font-black text-xs ${item.stock <= 5 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                            {item.stock} Units
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {adminMode === 'menu' && (
                    <td className="px-8 py-6 font-black text-orange-600 text-sm">
                      {hasSizes ? `from ₹${item.price}` : `₹${item.price}`}
                    </td>
                  )}

                  {adminMode === 'menu' && (
                    <td className="px-8 py-6">
                      <div className="flex items-center justify-center gap-2">
                        <button onClick={() => handleEdit(item)} className="p-3 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-2xl transition-all active:scale-90">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[60] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[3rem] p-10 max-w-2xl w-full shadow-2xl overflow-y-auto max-h-[90vh] animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-8">Dish Settings</h3>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Item Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Category</label>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all">
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Beverage">Beverage</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Pieces per Set</label>
                  <input type="number" value={formData.piecesPerSet} onChange={e => setFormData({ ...formData, piecesPerSet: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold focus:bg-white focus:border-orange-500 outline-none transition-all" min="1" />
                </div>
              </div>

              <div className="bg-slate-50 p-6 rounded-[2rem] border border-slate-200">
                <div className="flex items-center justify-between mb-4">
                   <h4 className="text-xs font-black uppercase tracking-widest">Price & Volume Options</h4>
                   <div className="flex bg-white p-1 rounded-xl shadow-inner border">
                      <button type="button" onClick={() => setHasVariations(false)} className={`px-4 py-2 rounded-lg text-[9px] font-black transition-all ${!hasVariations ? 'bg-orange-600 text-white' : 'text-slate-400'}`}>Single Price</button>
                      <button type="button" onClick={() => setHasVariations(true)} className={`px-4 py-2 rounded-lg text-[9px] font-black transition-all ${hasVariations ? 'bg-orange-600 text-white' : 'text-slate-400'}`}>Multiple Sizes/ML</button>
                   </div>
                </div>

                {!hasVariations ? (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 mb-1 uppercase">Price (₹)</label>
                      <input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 mb-1 uppercase">Base Stock</label>
                      <input type="number" value={formData.stock} onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })} className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-bold" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 animate-in fade-in">
                    {formData.variations?.map((v) => (
                      <div key={v.id} className="grid grid-cols-12 gap-2 items-end">
                        <div className="col-span-4">
                           <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Label</label>
                           <input type="text" value={v.label} onChange={e => updateVariation(v.id, 'label', e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" placeholder="Size/Unit" />
                        </div>
                        <div className="col-span-3">
                           <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Price</label>
                           <input type="number" value={v.price} onChange={e => updateVariation(v.id, 'price', Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" />
                        </div>
                        <div className="col-span-3">
                           <label className="text-[8px] font-black uppercase text-slate-400 block mb-1">Stock</label>
                           <input type="number" value={v.stock} onChange={e => updateVariation(v.id, 'stock', Number(e.target.value))} className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold" />
                        </div>
                        <div className="col-span-2">
                           <button type="button" onClick={() => removeVariation(v.id)} className="w-full bg-red-50 text-red-500 py-2 rounded-xl text-xs font-bold hover:bg-red-100">X</button>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addVariation} className="w-full py-3 border-2 border-dashed border-slate-300 text-slate-400 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:bg-slate-100 transition-colors mt-2">+ Add Size Variation</button>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Description</label>
                <textarea rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-5 py-3.5 text-sm font-bold resize-none focus:bg-white focus:border-orange-500 outline-none transition-all" placeholder="Describe the flavors..." />
              </div>
              
              <div className="flex gap-4 pt-4">
                <button type="submit" className="flex-1 bg-orange-600 text-white font-black py-5 rounded-[1.5rem] shadow-xl text-sm uppercase tracking-widest hover:-translate-y-1 transition-all">Confirm Dish</button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-8 py-5 font-black text-slate-500 hover:bg-slate-50 rounded-[1.5rem] text-sm uppercase tracking-widest">Discard</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
