
import React, { useState, useRef } from 'react';
import { MenuItem, ItemVariation } from '../types';
import { generateDishImage } from '../services/gemini';

interface AdminViewProps {
  menu: MenuItem[];
  setMenu: (m: MenuItem[]) => void;
}

const AdminView: React.FC<AdminViewProps> = ({ menu, setMenu }) => {
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [adminMode, setAdminMode] = useState<'menu' | 'inventory'>('menu');
  const [hasVariations, setHasVariations] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  const [manualInputs, setManualInputs] = useState<Record<string, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, image: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAiGenerate = async () => {
    if (!formData.name) {
      alert("Please enter a dish name first.");
      return;
    }
    setIsGeneratingImage(true);
    const imageUrl = await generateDishImage(formData.name, formData.description);
    if (imageUrl) {
      setFormData(prev => ({ ...prev, image: imageUrl }));
    } else {
      alert("Failed to generate image. Please try again.");
    }
    setIsGeneratingImage(false);
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
    setManualInputs(prev => ({ ...prev, [key]: '' }));
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
    <div className="flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Header Section */}
      <div className="bg-white border-b px-4 py-3 shrink-0 flex items-center justify-between shadow-sm">
        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
          <button 
            onClick={() => setAdminMode('menu')} 
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${adminMode === 'menu' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}
          >
            Menu
          </button>
          <button 
            onClick={() => setAdminMode('inventory')} 
            className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${adminMode === 'inventory' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}
          >
            Stock
          </button>
        </div>
        <button 
          onClick={openAddModal} 
          className="bg-slate-900 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider"
        >
          Add Item
        </button>
      </div>

      {/* Main List Section */}
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {menu.map(item => {
            const hasSizes = item.variations && item.variations.length > 0;
            return (
              <div key={item.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                <div className="p-3 border-b flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center font-black text-slate-300 border overflow-hidden shrink-0">
                    {item.image ? <img src={item.image} className="w-full h-full object-cover" /> : item.name[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[11px] font-black text-slate-800 leading-none truncate uppercase tracking-tighter">{item.name}</h3>
                    <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-tighter">{item.category} • Set of {item.piecesPerSet}</p>
                  </div>
                  {adminMode === 'menu' && (
                    <button onClick={() => handleEdit(item)} className="p-2 text-slate-300 hover:text-orange-600">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                  )}
                </div>

                <div className="p-3 bg-slate-50/50 flex-1">
                  {adminMode === 'inventory' ? (
                    <div className="space-y-2">
                      {hasSizes ? (
                        item.variations?.map(v => (
                          <div key={v.id} className="bg-white p-2 rounded-xl border border-slate-100">
                            <div className="flex justify-between items-center mb-1.5">
                              <span className="text-[9px] font-black uppercase text-slate-400">{v.label}</span>
                              <span className={`text-[10px] font-black ${v.stock <= 5 ? 'text-red-600' : 'text-green-600'}`}>{v.stock} pcs</span>
                            </div>
                            <div className="flex gap-1">
                              <input 
                                type="number" placeholder="Qty" 
                                value={manualInputs[`${item.id}-${v.id}`] || ''} 
                                onChange={(e) => handleManualInput(`${item.id}-${v.id}`, e.target.value)}
                                className="flex-1 min-w-0 bg-slate-50 border rounded-lg px-2 py-1 text-[10px] font-black"
                              />
                              <button onClick={() => applyManualRestock(item.id, 'add', v.id)} className="bg-green-600 text-white px-2 py-1 rounded-lg font-black text-[10px]">+</button>
                              <button onClick={() => applyManualRestock(item.id, 'sub', v.id)} className="bg-red-600 text-white px-2 py-1 rounded-lg font-black text-[10px]">-</button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center bg-white p-2 rounded-xl border border-slate-100">
                            <span className="text-[9px] font-black uppercase text-slate-400">Total Stock</span>
                            <span className={`text-[11px] font-black ${item.stock <= 5 ? 'text-red-600' : 'text-slate-800'}`}>{item.stock} Units</span>
                          </div>
                          <div className="flex gap-1">
                            <input 
                              type="number" placeholder="Adjust qty" 
                              value={manualInputs[item.id] || ''} 
                              onChange={(e) => handleManualInput(item.id, e.target.value)}
                              className="flex-1 min-w-0 bg-white border rounded-xl px-3 py-2 text-[10px] font-black"
                            />
                            <button onClick={() => applyManualRestock(item.id, 'add')} className="bg-slate-900 text-white px-4 rounded-xl font-black text-[10px]">ADD</button>
                            <button onClick={() => applyManualRestock(item.id, 'sub')} className="bg-slate-200 text-slate-600 px-4 rounded-xl font-black text-[10px]">MINUS</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-black text-orange-600">Rs{hasSizes ? `${Math.min(...item.variations!.map(v => v.price))}+` : item.price}</span>
                      <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded-full ${item.stock <= 5 ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-500'}`}>
                        {item.stock} Units
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit/Add Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex flex-col md:items-center md:justify-center">
          <div className="bg-white w-full h-full md:h-auto md:max-w-lg md:rounded-[2rem] flex flex-col shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4">
            <div className="p-4 border-b flex items-center justify-between bg-slate-50">
               <h3 className="text-xs font-black uppercase tracking-widest text-slate-900">Item Configuration</h3>
               <button onClick={() => setIsModalOpen(false)} className="text-slate-400 p-2"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg></button>
            </div>
            
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-5 space-y-5 custom-scrollbar pb-24">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Item Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs font-black focus:bg-white focus:border-orange-500 transition-all outline-none" />
                </div>
                
                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Item Photo</label>
                  <div className="flex gap-2">
                    <div className="flex-1 relative">
                       <input 
                         type="text" value={formData.image} placeholder="Image URL or Uploaded Base64"
                         onChange={e => setFormData({ ...formData, image: e.target.value })} 
                         className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-[10px] font-black focus:bg-white focus:border-orange-500 outline-none pr-10" 
                       />
                       {formData.image && (
                         <button type="button" onClick={() => setFormData({...formData, image: ''})} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">✕</button>
                       )}
                    </div>
                    <button 
                      type="button" onClick={() => fileInputRef.current?.click()}
                      className="bg-slate-100 hover:bg-slate-200 p-2.5 rounded-xl text-slate-600 transition-colors shrink-0"
                      title="Upload from device"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1M16 8l-4-4m0 0L8 8m4-4v12"/></svg>
                    </button>
                    <button 
                      type="button" onClick={handleAiGenerate} disabled={isGeneratingImage}
                      className={`bg-orange-100 p-2.5 rounded-xl text-orange-600 shrink-0 transition-all ${isGeneratingImage ? 'animate-pulse' : 'hover:bg-orange-200'}`}
                      title="Generate with AI"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>
                    </button>
                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileUpload} />
                  </div>
                  {formData.image && (
                    <div className="mt-3 w-24 h-24 rounded-2xl border-4 border-white shadow-lg overflow-hidden bg-slate-100">
                       <img src={formData.image} className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

                <div>
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Category</label>
                  <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full bg-slate-50 border rounded-xl px-4 py-2.5 text-xs font-black outline-none">
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Beverage">Beverage</option>
                  </select>
                </div>
              </div>

              <div className="bg-orange-50/50 p-4 rounded-2xl border border-orange-100">
                <div className="flex items-center justify-between mb-3">
                   <h4 className="text-[9px] font-black uppercase text-orange-700">Pricing Model</h4>
                   <div className="flex bg-white p-1 rounded-lg shadow-sm border text-[8px] font-black uppercase">
                      <button type="button" onClick={() => setHasVariations(false)} className={`px-2 py-1 rounded ${!hasVariations ? 'bg-orange-600 text-white' : 'text-slate-400'}`}>Simple</button>
                      <button type="button" onClick={() => setHasVariations(true)} className={`px-2 py-1 rounded ${hasVariations ? 'bg-orange-600 text-white' : 'text-slate-400'}`}>Variations</button>
                   </div>
                </div>

                {!hasVariations ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Price (Rs)</label>
                      <input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} className="w-full bg-white border rounded-xl px-3 py-2 text-[11px] font-black" />
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-slate-400 uppercase block mb-1">Starting Stock</label>
                      <input type="number" value={formData.stock} onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })} className="w-full bg-white border rounded-xl px-3 py-2 text-[11px] font-black" />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {formData.variations?.map((v) => (
                      <div key={v.id} className="grid grid-cols-12 gap-1.5 items-end bg-white p-2 rounded-xl border border-orange-100 shadow-sm">
                        <div className="col-span-5">
                           <input type="text" value={v.label} onChange={e => updateVariation(v.id, 'label', e.target.value)} className="w-full bg-slate-50 border-none rounded px-2 py-1.5 text-[9px] font-black" placeholder="Size (e.g. Small)" />
                        </div>
                        <div className="col-span-3">
                           <input type="number" value={v.price} onChange={e => updateVariation(v.id, 'price', Number(e.target.value))} className="w-full bg-slate-50 border-none rounded px-2 py-1.5 text-[9px] font-black" placeholder="Price" />
                        </div>
                        <div className="col-span-3">
                           <input type="number" value={v.stock} onChange={e => updateVariation(v.id, 'stock', Number(e.target.value))} className="w-full bg-slate-50 border-none rounded px-2 py-1.5 text-[9px] font-black" placeholder="Stock" />
                        </div>
                        <div className="col-span-1">
                           <button type="button" onClick={() => removeVariation(v.id)} className="text-red-400 p-1"><svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg></button>
                        </div>
                      </div>
                    ))}
                    <button type="button" onClick={addVariation} className="w-full py-2 border-2 border-dashed border-orange-200 text-orange-400 text-[9px] font-black uppercase rounded-xl">+ Add Size</button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Pieces per Set</label>
                    <input type="number" value={formData.piecesPerSet} onChange={e => setFormData({ ...formData, piecesPerSet: Number(e.target.value) })} className="w-full bg-slate-50 border rounded-xl px-4 py-2 text-xs font-black" />
                 </div>
                 <div>
                    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Low Stock Alert</label>
                    <input type="number" value={formData.minStock} onChange={e => setFormData({ ...formData, minStock: Number(e.target.value) })} className="w-full bg-slate-50 border rounded-xl px-4 py-2 text-xs font-black" />
                 </div>
              </div>

              <div>
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5">Short Description</label>
                <textarea rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full bg-slate-50 border rounded-xl px-4 py-2 text-xs font-black resize-none" />
              </div>
            </form>

            <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t flex gap-3 md:relative md:border-none">
              <button type="submit" onClick={handleSubmit} className="flex-1 bg-slate-900 text-white py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl">Save Changes</button>
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3.5 bg-slate-100 text-slate-500 rounded-2xl font-black text-xs uppercase">Back</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
