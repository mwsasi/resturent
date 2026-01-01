
import React, { useState, useEffect, useMemo } from 'react';
import { MenuItem, CartItem, Order, ItemVariation } from '../types';
import { getChefRecommendation } from '../services/gemini';

interface POSViewProps {
  menu: MenuItem[];
  cart: CartItem[];
  orders: Order[];
  addToCart: (item: MenuItem, variation?: ItemVariation) => void;
  updateQuantity: (cartKey: string, delta: number) => void;
  removeFromCart: (cartKey: string) => void;
  clearCart: () => void;
  completeOrder: (type: 'dine-in' | 'takeaway', tableNumber?: string) => Order | undefined;
  appendItemsToOrder: (orderId: string) => Order | undefined;
  updateOrderStatus: (orderId: string, status: Order['status'], paymentMethod?: Order['paymentMethod']) => void;
}

const POSView: React.FC<POSViewProps> = ({ 
  menu, 
  cart, 
  orders,
  addToCart, 
  updateQuantity, 
  removeFromCart, 
  clearCart, 
  completeOrder,
  appendItemsToOrder,
  updateOrderStatus
}) => {
  const [showQR, setShowQR] = useState(false);
  const [activeTab, setActiveTab] = useState<'menu' | 'orders'>('menu');
  const [chefPick, setChefPick] = useState<string>("Loading Chef's Special...");
  
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway'>('dine-in');
  const [tableNumber, setTableNumber] = useState('');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [settlingOrderId, setSettlingOrderId] = useState<string | null>(null);
  const [showSettlementModal, setShowSettlementModal] = useState(false);

  // Variation Selection State
  const [selectingItem, setSelectingItem] = useState<MenuItem | null>(null);

  useEffect(() => {
    const fetchRec = async () => {
      const rec = await getChefRecommendation(menu.map(m => m.name));
      setChefPick(rec);
    };
    fetchRec();
  }, [menu]);

  const grandTotal = cart.reduce((acc, item) => {
    const price = item.selectedVariation ? item.selectedVariation.price : item.price;
    return acc + (price * item.quantity);
  }, 0);

  const editingOrder = useMemo(() => 
    editingOrderId ? orders.find(o => o.id === editingOrderId) : null
  , [editingOrderId, orders]);

  const settlingOrder = useMemo(() => 
    settlingOrderId ? orders.find(o => o.id === settlingOrderId) : null
  , [settlingOrderId, orders]);

  const handleItemClick = (item: MenuItem) => {
    if (item.variations && item.variations.length > 0) {
      setSelectingItem(item);
    } else {
      addToCart(item);
    }
  };

  const handleVariationSelect = (variation: ItemVariation) => {
    if (selectingItem) {
      addToCart(selectingItem, variation);
      setSelectingItem(null);
    }
  };

  const handlePunchOrder = () => {
    if (cart.length === 0) return;
    if (editingOrderId) {
      appendItemsToOrder(editingOrderId);
      setEditingOrderId(null);
    } else {
      completeOrder(orderType, tableNumber);
    }
    setActiveTab('orders');
    setTableNumber('');
    clearCart();
  };

  const handleOpenSettlement = (orderId: string) => {
    setSettlingOrderId(orderId);
    setShowSettlementModal(true);
    setShowQR(false);
  };

  const handleSettlePaid = (method: 'cash' | 'qr') => {
    if (settlingOrderId) {
      if (method === 'qr' && !showQR) {
        setShowQR(true);
        return;
      }
      updateOrderStatus(settlingOrderId, 'delivered', method);
      setShowSettlementModal(false);
      setSettlingOrderId(null);
      setShowQR(false);
    }
  };

  const handleAddItemsToActiveOrder = (order: Order) => {
    setEditingOrderId(order.id);
    setOrderType(order.type);
    setActiveTab('menu');
    clearCart();
  };

  const handleCancelEdit = () => {
    setEditingOrderId(null);
    clearCart();
  };

  const pendingOrders = orders.filter(o => o.status !== 'delivered');

  return (
    <div className="h-full flex flex-col md:flex-row p-4 gap-4">
      <div className="flex-1 flex flex-col gap-4 no-print overflow-hidden">
        
        <div className="flex bg-slate-200 p-1 rounded-2xl self-start mb-2">
          <button 
            onClick={() => setActiveTab('menu')}
            className={`px-6 py-2 rounded-xl text-sm font-black transition-all ${activeTab === 'menu' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Menu
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`px-6 py-2 rounded-xl text-sm font-black transition-all flex items-center gap-2 ${activeTab === 'orders' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
          >
            Active Orders
            {pendingOrders.length > 0 && (
              <span className="bg-orange-500 text-white text-[10px] w-5 h-5 flex items-center justify-center rounded-full animate-pulse">
                {pendingOrders.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'menu' ? (
          <>
            <div className="bg-orange-50 border-l-4 border-orange-500 p-3 rounded shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-black text-orange-700 uppercase text-xs tracking-tighter bg-orange-200 px-2 py-1 rounded">Chef's Pick</span>
                <span className="text-orange-600 italic text-sm font-medium">{chefPick}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-8">
              {menu.map(item => {
                const hasVariations = item.variations && item.variations.length > 0;
                const outOfStock = hasVariations 
                  ? item.variations!.every(v => v.stock <= 0)
                  : item.stock <= 0;
                
                return (
                  <div 
                    key={item.id} 
                    onClick={() => !outOfStock && handleItemClick(item)}
                    className={`bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer transition-all active:scale-95 duration-200 group flex flex-col ${outOfStock ? 'opacity-50 grayscale cursor-not-allowed' : 'hover:shadow-xl hover:-translate-y-1'}`}
                  >
                    <div className="h-40 bg-slate-100 overflow-hidden relative">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50">
                          <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-400 font-black text-xl mb-1">
                            {item.name[0]}
                          </div>
                          <span className="text-[10px] text-slate-300 font-bold uppercase tracking-widest">No Image Set</span>
                        </div>
                      )}
                      <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                        <span className="bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-black text-slate-800 shadow-sm border border-slate-100">
                          {hasVariations ? `from ₹${Math.min(...item.variations!.map(v => v.price))}` : `₹${item.price}`}
                        </span>
                        {item.piecesPerSet && item.piecesPerSet > 1 && (
                          <span className="bg-orange-600 text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-sm">
                            Set of {item.piecesPerSet}
                          </span>
                        )}
                        {hasVariations && (
                           <span className="bg-blue-600 text-white px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest shadow-sm">
                             Sizes Available
                           </span>
                        )}
                        <span className={`px-2 py-0.5 rounded-lg text-[10px] font-black border uppercase transition-all ${
                          outOfStock ? 'bg-red-500 text-white border-red-500' : 'bg-green-50 text-green-700 border-green-200'
                        }`}>
                          {outOfStock ? 'Out of Stock' : hasVariations ? 'Select size' : `Stock: ${item.stock}`}
                        </span>
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col">
                      <div className="mb-2">
                        <h3 className="font-black text-slate-800 leading-tight mb-0.5">{item.name}</h3>
                        <span className="text-[8px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 font-black uppercase tracking-widest">{item.category}</span>
                      </div>
                      <p className="text-xs text-slate-500 italic line-clamp-3 flex-1 mb-3">
                        {item.description || "Freshly prepared south Indian delicacy."}
                      </p>
                      <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                        <div className="flex items-center gap-1">
                          <div className={`w-2 h-2 rounded-full ${outOfStock ? 'bg-red-500' : 'bg-green-500'}`}></div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase">{outOfStock ? 'Unavailable' : 'In Stock'}</span>
                        </div>
                        <div className={`p-2 rounded-xl transition-colors ${outOfStock ? 'bg-slate-200 text-slate-400' : 'bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white'}`}>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          /* Active Orders Management View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-8">
            {pendingOrders.length === 0 ? (
              <div className="col-span-full h-64 flex flex-col items-center justify-center text-slate-400 italic text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-4 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                <p className="font-bold uppercase tracking-widest text-[10px]">No active orders at the moment.</p>
              </div>
            ) : (
              pendingOrders.map(order => (
                <div key={order.id} className={`bg-white rounded-[2rem] p-6 shadow-sm border ${editingOrderId === order.id ? (order.type === 'dine-in' ? 'border-green-500 ring-4 ring-green-100 scale-[1.02]' : 'border-red-500 ring-4 ring-red-100 scale-[1.02]') : 'border-slate-100'} flex flex-col gap-4 transition-all hover:shadow-md relative overflow-hidden group`}>
                  <div className={`absolute top-0 right-0 px-4 py-1.5 text-[8px] font-black uppercase tracking-widest flex items-center gap-2 ${order.type === 'dine-in' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}`}>
                    {order.type} {order.tableNumber && `- TABLE ${order.tableNumber}`}
                  </div>
                  <div className="flex justify-between items-start mt-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(order.date).toLocaleTimeString()}</p>
                      <h4 className="font-black text-slate-800 text-sm tracking-tight">{order.id}</h4>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  
                  <div className="flex-1 space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {order.items.map((item, idx) => {
                      const price = item.selectedVariation ? item.selectedVariation.price : item.price;
                      return (
                        <div key={idx} className="flex justify-between text-xs font-medium text-slate-600">
                          <span className="flex flex-col">
                            <span className="flex gap-1">
                               <span className="text-slate-300 font-black">{item.quantity}x</span> 
                               {item.name}
                               {item.piecesPerSet && item.piecesPerSet > 1 && (
                                 <span className="text-[9px] bg-slate-100 px-1.5 rounded font-black text-slate-500 ml-1">SET ({item.piecesPerSet} pcs)</span>
                               )}
                            </span>
                            {item.selectedVariation && (
                              <span className="text-[9px] text-slate-400 ml-5 font-bold uppercase">{item.selectedVariation.label}</span>
                            )}
                          </span>
                          <span className="font-bold">₹{price * item.quantity}</span>
                        </div>
                      );
                    })}
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex flex-col gap-3 bg-slate-50/50 -mx-6 -mb-6 p-6">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Bill</span>
                      <span className="font-black text-slate-900 text-lg">₹{order.grandTotal.toFixed(2)}</span>
                    </div>
                    
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        {order.status === 'pending' && (
                          <>
                            <button 
                              onClick={() => handleOpenSettlement(order.id)}
                              className="flex-1 bg-slate-900 text-white text-[10px] font-black uppercase py-3 rounded-xl hover:bg-black transition-colors shadow-lg shadow-slate-200"
                            >
                              Settle Payment
                            </button>
                            <button 
                              onClick={() => handleAddItemsToActiveOrder(order)}
                              className={`flex-1 text-[10px] font-black uppercase py-3 rounded-xl transition-all flex items-center justify-center gap-1 shadow-lg ${
                                editingOrderId === order.id 
                                  ? (order.type === 'dine-in' ? 'bg-green-600 text-white shadow-green-200' : 'bg-red-600 text-white shadow-red-200') 
                                  : (order.type === 'dine-in' ? 'bg-white border border-slate-200 text-green-600 shadow-slate-100 hover:border-green-200 hover:bg-green-50' : 'bg-white border border-slate-200 text-red-600 shadow-slate-100 hover:border-red-200 hover:bg-red-50')
                              }`}
                            >
                              {editingOrderId === order.id ? 'Updating...' : 'Add Items'}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* Cart & Billing Sidebar */}
      <div className="w-full md:w-80 lg:w-96 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col no-print relative overflow-hidden transition-all duration-300">
        <div className={`p-6 border-b flex items-center justify-between transition-colors ${editingOrderId ? (orderType === 'dine-in' ? 'bg-green-600 text-white' : 'bg-red-600 text-white') : 'bg-white'}`}>
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-xl ${editingOrderId ? (orderType === 'dine-in' ? 'bg-green-500' : 'bg-red-500') : 'bg-orange-50'}`}>
               <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${editingOrderId ? 'text-white' : 'text-orange-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
               </svg>
             </div>
             <div className="flex flex-col">
                <h2 className={`text-sm font-black tracking-tight ${editingOrderId ? 'text-white' : 'text-slate-800'}`}>
                  {editingOrderId ? `Updating ${orderType.toUpperCase()}` : 'Current Check'}
                </h2>
             </div>
          </div>
          <button 
            onClick={editingOrderId ? handleCancelEdit : clearCart} 
            className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all ${editingOrderId ? (orderType === 'dine-in' ? 'bg-green-500 text-white' : 'bg-red-500 text-white') : 'bg-red-50 text-red-500 hover:text-red-700 hover:bg-red-100'}`}
          >
            {editingOrderId ? 'Cancel' : 'Reset'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-30 space-y-4 text-center">
              <p className="font-black text-xs uppercase tracking-[0.3em]">No Items Selected</p>
            </div>
          ) : (
            cart.map((item, idx) => {
              const price = item.selectedVariation ? item.selectedVariation.price : item.price;
              const cartKey = item.selectedVariation ? `${item.id}-${item.selectedVariation.id}` : item.id;
              
              return (
                <div key={idx} className="flex items-center gap-4 group animate-in slide-in-from-right duration-200">
                  <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 shadow-sm relative group">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-black text-slate-400 bg-slate-50 text-xl">{item.name[0]}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-black text-slate-800 truncate leading-tight">{item.name}</h4>
                    <div className="flex items-center gap-2">
                       {item.selectedVariation && (
                         <p className="text-[9px] font-black text-orange-600 uppercase tracking-widest">{item.selectedVariation.label}</p>
                       )}
                       {item.piecesPerSet && item.piecesPerSet > 1 && (
                         <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-1 rounded">Set of {item.piecesPerSet}</p>
                       )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <button onClick={() => updateQuantity(cartKey, -1)} className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-800 hover:bg-orange-50 hover:text-orange-600 transition-all shadow-sm font-black text-lg">-</button>
                      <span className="text-xs font-black w-6 text-center text-slate-900 bg-slate-100 rounded-lg py-1">{item.quantity}</span>
                      <button onClick={() => updateQuantity(cartKey, 1)} className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-800 hover:bg-orange-50 hover:text-orange-600 transition-all shadow-sm font-black text-lg">+</button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-black text-slate-900">₹{price * item.quantity}</p>
                    <button onClick={() => removeFromCart(cartKey)} className="text-[9px] font-black text-red-400 hover:text-red-600 uppercase tracking-tighter mt-1">Remove</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-8 bg-slate-50/80 border-t border-slate-200 rounded-b-[2.5rem] backdrop-blur-sm">
          {!editingOrderId && (
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-6 border border-slate-200 shadow-inner">
              <button 
                onClick={() => setOrderType('dine-in')}
                className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${orderType === 'dine-in' ? 'bg-white text-green-600 shadow-sm' : 'text-slate-400'}`}
              >
                Dine In
              </button>
              <button 
                onClick={() => setOrderType('takeaway')}
                className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${orderType === 'takeaway' ? 'bg-white text-red-600 shadow-sm' : 'text-slate-400'}`}
              >
                Takeaway
              </button>
            </div>
          )}
          
          {orderType === 'dine-in' && !editingOrderId && (
            <input 
              type="text" 
              placeholder="Table Number (e.g. 05)" 
              value={tableNumber}
              onChange={(e) => setTableNumber(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-green-500 mb-6 transition-all shadow-sm"
            />
          )}

          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center group">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{editingOrderId ? 'Addition Subtotal' : 'Current Check'}</span>
              <span className={`text-2xl font-black tabular-nums ${editingOrderId ? (orderType === 'dine-in' ? 'text-green-600' : 'text-red-600') : 'text-slate-900'}`}>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
          
          <button 
            disabled={cart.length === 0}
            onClick={handlePunchOrder}
            className={`w-full flex items-center justify-center gap-3 text-white font-black py-5 rounded-[1.5rem] shadow-xl transition-all text-[12px] uppercase tracking-[0.2em] hover:-translate-y-0.5 active:translate-y-0 ${editingOrderId ? (orderType === 'dine-in' ? 'bg-green-600 shadow-green-200' : 'bg-red-600 shadow-red-200') : 'bg-slate-900 shadow-slate-100 hover:bg-black'} disabled:opacity-50 disabled:shadow-none disabled:translate-y-0`}
          >
            {editingOrderId ? 'Update Order' : 'Confirm Order'}
          </button>
        </div>
      </div>

      {/* Variation Selection Modal */}
      {selectingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md flex items-center justify-center z-[70] p-4 animate-in fade-in duration-300">
           <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-300">
              <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-2">Select Volume/Size</h3>
              <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-8">{selectingItem.name}</p>
              
              <div className="grid grid-cols-1 gap-3 mb-8">
                 {selectingItem.variations?.map(v => {
                   const outOfStock = v.stock <= 0;
                   return (
                     <button 
                       key={v.id}
                       disabled={outOfStock}
                       onClick={() => handleVariationSelect(v)}
                       className={`flex items-center justify-between p-6 rounded-[1.5rem] border-2 transition-all group ${
                         outOfStock 
                           ? 'bg-slate-50 border-slate-100 opacity-50 cursor-not-allowed' 
                           : 'bg-white border-slate-100 hover:border-orange-500 hover:bg-orange-50 active:scale-[0.98]'
                       }`}
                     >
                       <div className="text-left">
                          <span className={`text-sm font-black transition-colors ${outOfStock ? 'text-slate-400' : 'text-slate-800 group-hover:text-orange-600'}`}>{v.label}</span>
                          <p className="text-[10px] font-bold text-slate-400">{outOfStock ? 'Unavailable' : `${v.stock} in stock`}</p>
                       </div>
                       <span className={`font-black text-sm ${outOfStock ? 'text-slate-300' : 'text-slate-900'}`}>₹{v.price}</span>
                     </button>
                   );
                 })}
              </div>

              <button 
                onClick={() => setSelectingItem(null)}
                className="w-full bg-slate-100 text-slate-400 font-black py-4 rounded-full hover:bg-slate-200 transition-colors text-[10px] uppercase tracking-[0.2em]"
              >
                Back to Menu
              </button>
           </div>
        </div>
      )}

      {/* Settlement / Payment Modal */}
      {showSettlementModal && settlingOrder && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-[4rem] p-10 max-w-sm w-full text-center shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500">
            {!showQR ? (
              <>
                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner ${settlingOrder.type === 'dine-in' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                   <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">Settle Payment</h3>
                <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] mb-4">{settlingOrder.type.toUpperCase()} {settlingOrder.tableNumber && `- Table ${settlingOrder.tableNumber}`}</p>
                <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
                   <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest block mb-1">Payable Amount</span>
                   <span className={`text-3xl font-black ${settlingOrder.type === 'dine-in' ? 'text-green-600' : 'text-red-600'}`}>₹{settlingOrder.grandTotal.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button onClick={() => handleSettlePaid('qr')} className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-white border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50 transition-all group">
                    <span className="text-[10px] font-black uppercase tracking-widest">Pay via QR</span>
                  </button>
                  <button onClick={() => handleSettlePaid('cash')} className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-white border-2 border-slate-100 hover:border-slate-900 hover:bg-slate-50 transition-all group">
                    <span className="text-[10px] font-black uppercase tracking-widest">Pay via Cash</span>
                  </button>
                </div>

                <button onClick={() => setShowSettlementModal(false)} className="w-full bg-slate-100 text-slate-500 font-black py-4 rounded-full hover:bg-slate-200 transition-colors text-[10px] uppercase tracking-[0.2em]">Close Window</button>
              </>
            ) : (
              <>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">Scan & Pay</h3>
                <div className="bg-slate-50 p-8 rounded-[3rem] mb-10 border-2 border-slate-100 ring-8 ring-slate-50">
                  <div className="aspect-square bg-white p-6 rounded-[2rem] shadow-xl flex items-center justify-center">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=spiceroute@bank&pn=SpiceRoute&am=${settlingOrder.grandTotal}&cu=INR`} 
                      alt="Payment QR" 
                      className="w-full h-full"
                    />
                  </div>
                </div>
                <button onClick={() => handleSettlePaid('qr')} className="w-full bg-green-600 text-white font-black py-6 rounded-[2.5rem] shadow-2xl shadow-green-200 hover:bg-green-700 transition-all text-sm uppercase tracking-[0.2em] active:scale-95">Confirm Paid</button>
                <button onClick={() => setShowQR(false)} className="w-full bg-white text-slate-400 font-black py-4 rounded-full hover:bg-slate-50 transition-colors text-[10px] uppercase tracking-[0.2em] mt-4">Back</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default POSView;
