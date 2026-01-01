
import React, { useState, useEffect } from 'react';
import { MenuItem } from '../types';
import { generateDishImage } from '../services/gemini';

interface AdminViewProps {
  menu: MenuItem[];
  setMenu: (m: MenuItem[]) => void;
}

const AdminView: React.FC<AdminViewProps> = ({ menu, setMenu }) => {
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [imageSize, setImageSize] = useState<"1K" | "2K" | "4K">("1K");

  const initialFormState: Omit<MenuItem, 'id'> = {
    name: '',
    price: 0,
    category: 'Breakfast',
    image: '',
    description: ''
  };

  const [formData, setFormData] = useState<Omit<MenuItem, 'id'>>(initialFormState);

  useEffect(() => {
    const checkKey = async () => {
      // @ts-ignore - aistudio is provided by the execution environment
      const hasKey = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(hasKey);
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    // @ts-ignore - aistudio is provided by the execution environment
    await window.aistudio.openSelectKey();
    setHasApiKey(true);
  };

  const handleEdit = (item: MenuItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      price: item.price,
      category: item.category,
      image: item.image,
      description: item.description
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Are you sure you want to delete this item?')) {
      setMenu(menu.filter(i => i.id !== id));
    }
  };

  const handleAiGenerateImage = async () => {
    if (!hasApiKey) {
      alert("Please connect your Google AI Studio API Key first to use High Quality Image Generation.");
      await handleSelectKey();
      return;
    }
    if (!formData.name) {
      alert("Please enter an item name first so the AI knows what to generate.");
      return;
    }
    setIsGeneratingImage(true);
    try {
      const generatedUrl = await generateDishImage(formData.name, formData.description, imageSize);
      if (generatedUrl) {
        setFormData(prev => ({ ...prev, image: generatedUrl }));
      } else {
        alert("Failed to generate image. Please ensure you have a valid paid project key and try again.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred during generation.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingItem) {
      setMenu(menu.map(i => i.id === editingItem.id ? { ...editingItem, ...formData } : i));
    } else {
      const newItem: MenuItem = {
        id: Date.now().toString(),
        ...formData
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
    setIsModalOpen(true);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto h-full overflow-y-auto">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Menu Management</h2>
          <p className="text-slate-500 text-sm">Design your menu with Gemini 3 Pro high-resolution photography.</p>
        </div>
        <div className="flex items-center gap-2">
          {!hasApiKey ? (
            <button 
              onClick={handleSelectKey}
              className="bg-indigo-100 text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border border-indigo-200 hover:bg-indigo-200 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              Connect AI Studio Key
            </button>
          ) : (
            <div className="bg-green-100 text-green-700 px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border border-green-200">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
              AI Studio Active
              <button onClick={handleSelectKey} className="ml-2 text-green-800 underline hover:no-underline">Change</button>
            </div>
          )}
          <button 
            onClick={openAddModal}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg font-bold shadow-lg shadow-orange-100 hover:bg-orange-700 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add New Item
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Item</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Category</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Price</th>
              <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {menu.map(item => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-slate-100 overflow-hidden flex items-center justify-center shrink-0">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xs font-bold text-slate-400">{item.name[0]}</span>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{item.name}</p>
                      <p className="text-xs text-slate-500 line-clamp-1 max-w-xs">{item.description}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-600">
                    {item.category}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-orange-600">₹{item.price}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(item)} className="p-2 text-slate-400 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(item.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-2xl p-8 max-w-lg w-full shadow-2xl overflow-y-auto max-h-[90vh]">
            <h3 className="text-xl font-bold text-slate-800 mb-6">{editingItem ? 'Edit Dish' : 'Add New Dish'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Item Name</label>
                <input 
                  required
                  type="text" 
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Price (₹)</label>
                  <input 
                    required
                    type="number" 
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Category</label>
                  <select 
                    value={formData.category}
                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                  >
                    <option value="Breakfast">Breakfast</option>
                    <option value="Lunch">Lunch</option>
                    <option value="Dinner">Dinner</option>
                    <option value="Beverage">Beverage</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Description</label>
                <textarea 
                  rows={2}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 focus:ring-2 focus:ring-orange-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase mb-1">High Quality Image Generation</label>
                <div className="flex flex-col gap-3">
                  <div className="flex gap-2 p-1 bg-slate-100 rounded-lg self-start">
                    {(['1K', '2K', '4K'] as const).map((size) => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setImageSize(size)}
                        className={`px-3 py-1 rounded-md text-[10px] font-black transition-all ${imageSize === size ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                        {size}
                      </button>
                    ))}
                  </div>
                  
                  <div className="flex gap-2">
                    <div className="flex-1 bg-slate-50 border border-slate-200 rounded-lg p-2 min-h-[120px] flex items-center justify-center relative overflow-hidden group">
                      {formData.image ? (
                        <img src={formData.image} className="absolute inset-0 w-full h-full object-cover" alt="Preview" />
                      ) : (
                        <div className="text-center px-4">
                          <p className="text-xs text-slate-400 italic mb-2">High Quality AI Photographer</p>
                          <p className="text-[10px] text-slate-300">Requires a Paid Google AI Studio Key</p>
                        </div>
                      )}
                      {isGeneratingImage && (
                        <div className="absolute inset-0 bg-indigo-900/60 backdrop-blur-sm flex flex-col items-center justify-center text-white">
                          <div className="w-8 h-8 border-4 border-indigo-400 border-t-white rounded-full animate-spin mb-3"></div>
                          <span className="text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">Gemini 3 Pro Rendering...</span>
                          <span className="text-[8px] opacity-60 mt-1 italic">Generating {imageSize} Masterpiece</span>
                        </div>
                      )}
                    </div>
                    <button 
                      type="button"
                      onClick={handleAiGenerateImage}
                      disabled={isGeneratingImage}
                      className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-xs flex flex-col items-center justify-center gap-2 hover:bg-indigo-700 disabled:opacity-50 transition-all shrink-0 w-24"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Generate {imageSize}</span>
                    </button>
                  </div>
                  <div className="text-[9px] text-slate-400 leading-tight">
                    * Make sure your AI Studio key is connected. High-res images can take 10-20 seconds to render.
                    <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="ml-1 text-indigo-500 underline">Billing Info</a>
                  </div>
                </div>
                <input 
                  type="text" 
                  placeholder="Or paste an image URL"
                  value={formData.image.startsWith('data:') ? `AI ${imageSize} Generated Image` : formData.image}
                  onChange={e => setFormData({ ...formData, image: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg px-4 py-2 mt-3 focus:ring-2 focus:ring-orange-500 outline-none text-[10px]" 
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 bg-orange-600 text-white font-bold py-3 rounded-xl hover:bg-orange-700">
                  {editingItem ? 'Save Changes' : 'Create Item'}
                </button>
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-3 font-semibold text-slate-500 hover:bg-slate-50 rounded-xl">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminView;
