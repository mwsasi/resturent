
import React, { useState, useEffect, useMemo } from 'react';
import { MenuItem, CartItem, Order } from '../types';
import { getChefRecommendation } from '../services/gemini';

interface POSViewProps {
  menu: MenuItem[];
  cart: CartItem[];
  orders: Order[];
  addToCart: (item: MenuItem) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
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
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [chefPick, setChefPick] = useState<string>("Loading Chef's Special...");
  
  // State for Order Options
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway'>('dine-in');
  const [tableNumber, setTableNumber] = useState('');
  
  // State for Updating Active Order
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);

  // State for Settlement (Payment)
  const [settlingOrderId, setSettlingOrderId] = useState<string | null>(null);
  const [showSettlementModal, setShowSettlementModal] = useState(false);

  useEffect(() => {
    const fetchRec = async () => {
      const rec = await getChefRecommendation(menu.map(m => m.name));
      setChefPick(rec);
    };
    fetchRec();
  }, [menu]);

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const grandTotal = subtotal;

  const editingOrder = useMemo(() => 
    editingOrderId ? orders.find(o => o.id === editingOrderId) : null
  , [editingOrderId, orders]);

  const settlingOrder = useMemo(() => 
    settlingOrderId ? orders.find(o => o.id === settlingOrderId) : null
  , [settlingOrderId, orders]);

  const handlePunchOrder = () => {
    if (cart.length === 0) return;
    
    let order;
    if (editingOrderId) {
      order = appendItemsToOrder(editingOrderId);
      setEditingOrderId(null);
    } else {
      order = completeOrder(orderType, tableNumber);
    }

    if (order) {
      setLastOrder(order);
      setActiveTab('orders');
      setTableNumber('');
      clearCart();
    }
  };

  const handleOpenSettlement = (orderId: string) => {
    setSettlingOrderId(orderId);
    setShowSettlementModal(true);
    setShowQR(false); // Reset QR state
  };

  const handleSettlePaid = (method: 'cash' | 'qr') => {
    if (settlingOrderId) {
      if (method === 'qr' && !showQR) {
        setShowQR(true);
        return;
      }
      // Direct closure: Mark as delivered immediately so it leaves the Active Orders list
      // Pass the payment method to updateOrderStatus
      updateOrderStatus(settlingOrderId, 'delivered', method);
      setShowSettlementModal(false);
      setSettlingOrderId(null);
      setShowQR(false);
    }
  };

  const handleAddItemsToActiveOrder = (order: Order) => {
    setEditingOrderId(order.id);
    setActiveTab('menu');
    clearCart();
  };

  const handleCancelEdit = () => {
    setEditingOrderId(null);
    clearCart();
  };

  const handlePrint = () => {
    window.print();
  };

  const pendingOrders = orders.filter(o => o.status !== 'delivered');

  return (
    <div className="h-full flex flex-col md:flex-row p-4 gap-4">
      {/* Main Interaction Area */}
      <div className="flex-1 flex flex-col gap-4 no-print overflow-hidden">
        
        {/* Tab Switcher */}
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
              {menu.map(item => (
                <div 
                  key={item.id} 
                  onClick={() => addToCart(item)}
                  className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 duration-200 group flex flex-col"
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
                    <div className="absolute top-2 right-2">
                      <span className="bg-white/90 backdrop-blur-md px-2 py-1 rounded-lg text-xs font-black text-slate-800 shadow-sm border border-slate-100">
                        ₹{item.price}
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
                        <div className="w-2 h-2 rounded-full bg-green-500"></div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase">Instock</span>
                      </div>
                      <div className="bg-orange-50 text-orange-600 p-2 rounded-xl group-hover:bg-orange-600 group-hover:text-white transition-colors">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
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
                <div key={order.id} className={`bg-white rounded-[2rem] p-6 shadow-sm border ${editingOrderId === order.id ? 'border-orange-500 ring-4 ring-orange-100 scale-[1.02]' : 'border-slate-100'} flex flex-col gap-4 transition-all hover:shadow-md relative overflow-hidden group`}>
                  <div className={`absolute top-0 right-0 px-4 py-1.5 text-[8px] font-black uppercase tracking-widest flex items-center gap-2 ${order.type === 'dine-in' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-white'}`}>
                    {order.type === 'dine-in' ? (
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                         <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                         <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                       </svg>
                    ) : (
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                         <path d="M11 17a1 1 0 001.447.894l4-2A1 1 0 0017 15V9.236a1 1 0 00-1.447-.894l-4 2a1 1 0 00-.553.894V17zM15.211 6.276a1 1 0 000-1.788l-4.764-2.382a1 1 0 00-.894 0L4.789 4.488a1 1 0 000 1.788l4.764 2.382a1 1 0 00.894 0l4.764-2.382zM4.447 8.342A1 1 0 003 9.236V15a1 1 0 00.553.894l4 2A1 1 0 009 17v-5.764a1 1 0 00-.553-.894l-4-2z" />
                       </svg>
                    )}
                    {order.type} {order.tableNumber && `- TABLE ${order.tableNumber}`}
                  </div>
                  <div className="flex justify-between items-start mt-6">
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(order.date).toLocaleTimeString()}</p>
                      <h4 className="font-black text-slate-800 text-sm tracking-tight">{order.id}</h4>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter ${
                      order.status === 'pending' ? 'bg-yellow-100 text-yellow-700' : 
                      order.status === 'paid' ? 'bg-blue-100 text-blue-700' : 
                      'bg-green-100 text-green-700'
                    }`}>
                      {order.status}
                    </span>
                  </div>
                  
                  <div className="flex-1 space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-xs font-medium text-slate-600">
                        <span className="flex gap-1">
                           <span className="text-slate-300 font-black">{item.quantity}x</span> 
                           {item.name}
                        </span>
                        <span className="font-bold">₹{item.price * item.quantity}</span>
                      </div>
                    ))}
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
                            {order.type === 'dine-in' && (
                              <button 
                                onClick={() => handleAddItemsToActiveOrder(order)}
                                className={`flex-1 text-[10px] font-black uppercase py-3 rounded-xl transition-all flex items-center justify-center gap-1 shadow-lg ${editingOrderId === order.id ? 'bg-orange-600 text-white shadow-orange-200' : 'bg-white border border-slate-200 text-orange-600 shadow-slate-100 hover:border-orange-200 hover:bg-orange-50'}`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                                </svg>
                                {editingOrderId === order.id ? 'Updating...' : 'Add Items'}
                              </button>
                            )}
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
        
        {/* Dynamic Cart Header */}
        <div className={`p-6 border-b flex items-center justify-between transition-colors ${editingOrderId ? 'bg-orange-600 text-white' : 'bg-white'}`}>
          <div className="flex items-center gap-3">
             <div className={`p-2 rounded-xl ${editingOrderId ? 'bg-orange-500' : 'bg-orange-50'}`}>
               <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${editingOrderId ? 'text-white' : 'text-orange-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
               </svg>
             </div>
             <div className="flex flex-col">
                <h2 className={`text-sm font-black tracking-tight ${editingOrderId ? 'text-white' : 'text-slate-800'}`}>
                  {editingOrderId ? `Table ${editingOrder?.tableNumber}` : 'Current Check'}
                </h2>
                {editingOrderId && <span className="text-[8px] font-black uppercase opacity-60 tracking-[0.2em] animate-pulse">Update Mode Active</span>}
             </div>
          </div>
          <button 
            onClick={editingOrderId ? handleCancelEdit : clearCart} 
            className={`text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-full transition-all ${editingOrderId ? 'bg-orange-500 text-white hover:bg-orange-400' : 'bg-red-50 text-red-500 hover:text-red-700 hover:bg-red-100'}`}
          >
            {editingOrderId ? 'Cancel Edit' : 'Reset'}
          </button>
        </div>

        {/* Previous Items Summary during Update */}
        {editingOrderId && editingOrder && (
          <div className="bg-orange-50/50 px-6 py-4 border-b border-orange-100">
            <h3 className="text-[9px] font-black text-orange-400 uppercase tracking-widest mb-3">Previously Ordered</h3>
            <div className="space-y-1.5 opacity-60 max-h-24 overflow-y-auto custom-scrollbar">
              {editingOrder.items.map((item, idx) => (
                <div key={idx} className="flex justify-between text-[10px] font-bold text-slate-500 italic">
                  <span>{item.quantity}x {item.name}</span>
                  <span>₹{item.price * item.quantity}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Order Type Toggle - Hidden during edit */}
        {!editingOrderId && (
          <div className="px-6 pt-6 animate-in slide-in-from-top duration-300">
            <div className="flex bg-slate-100 p-1 rounded-2xl mb-3 border border-slate-200 shadow-inner">
              <button 
                onClick={() => setOrderType('dine-in')}
                className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${orderType === 'dine-in' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}
              >
                Dine In
              </button>
              <button 
                onClick={() => setOrderType('takeaway')}
                className={`flex-1 py-2.5 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all flex items-center justify-center gap-2 ${orderType === 'takeaway' ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}
              >
                Takeaway
              </button>
            </div>
            {orderType === 'dine-in' && (
              <div className="relative group">
                <input 
                  type="text" 
                  placeholder="Table Number (e.g. 05)" 
                  value={tableNumber}
                  onChange={(e) => setTableNumber(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold outline-none focus:border-orange-500 focus:bg-white transition-all shadow-sm"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[8px] font-black text-slate-300 uppercase tracking-widest group-focus-within:text-orange-400">Entry</span>
              </div>
            )}
          </div>
        )}

        {/* New Items Cart Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-30 space-y-4 text-center select-none">
              <div className="p-10 rounded-full bg-slate-50 border-4 border-dotted border-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-20 w-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="font-black text-xs uppercase tracking-[0.3em]">No Items Selected</p>
                {editingOrderId && <p className="text-[10px] mt-2 font-bold text-orange-500">Add dishes to update Table {editingOrder?.tableNumber}</p>}
              </div>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center gap-4 group animate-in slide-in-from-right duration-200">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200 shadow-sm relative group">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-slate-400 bg-slate-50 text-xl">{item.name[0]}</div>
                  )}
                  {editingOrderId && <div className="absolute inset-0 bg-orange-500/10 border-2 border-orange-500/20 rounded-2xl"></div>}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-[13px] font-black text-slate-800 truncate leading-tight">{item.name}</h4>
                  <div className="flex items-center gap-2 mt-2">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-800 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm font-black text-lg">-</button>
                    <span className="text-xs font-black w-6 text-center text-slate-900 bg-slate-100 rounded-lg py-1">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-800 hover:bg-orange-50 hover:text-orange-600 hover:border-orange-200 transition-all shadow-sm font-black text-lg">+</button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">₹{item.price * item.quantity}</p>
                  <button onClick={() => removeFromCart(item.id)} className="text-[9px] font-black text-red-400 hover:text-red-600 uppercase tracking-tighter mt-1 hover:underline">Remove</button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Footer */}
        <div className="p-8 bg-slate-50/80 border-t border-slate-200 rounded-b-[2.5rem] backdrop-blur-sm">
          <div className="space-y-4 mb-8">
            <div className="flex justify-between items-center group">
              <div className="flex flex-col">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{editingOrderId ? 'Addition Subtotal' : 'Current Check'}</span>
                {editingOrderId && <span className="text-[8px] font-bold text-orange-400 italic">Adding to Table {editingOrder?.tableNumber}</span>}
              </div>
              <span className={`text-2xl font-black tabular-nums ${editingOrderId ? 'text-orange-600' : 'text-slate-900'}`}>₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="flex flex-col gap-3">
            <button 
              disabled={cart.length === 0}
              onClick={handlePunchOrder}
              className={`w-full flex items-center justify-center gap-3 text-white font-black py-5 rounded-[1.5rem] shadow-xl transition-all text-[12px] uppercase tracking-[0.2em] hover:-translate-y-0.5 active:translate-y-0 ${editingOrderId ? 'bg-orange-600 shadow-orange-200' : 'bg-slate-900 shadow-slate-100 hover:bg-black'} disabled:opacity-50 disabled:shadow-none disabled:translate-y-0`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {editingOrderId ? 'Update Order' : 'Confirm Order'}
            </button>
            {!editingOrderId && (
              <button 
                onClick={handlePrint}
                disabled={!lastOrder}
                className="w-full flex items-center justify-center gap-2 bg-white border-2 border-slate-100 text-slate-600 font-black py-4 rounded-[1.5rem] hover:bg-slate-50 disabled:opacity-50 transition-all text-[11px] uppercase tracking-[0.15em]"
              >
                Print Receipt
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Settlement / Payment Modal */}
      {showSettlementModal && settlingOrder && (
        <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-50 p-4 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white rounded-[4rem] p-10 max-w-sm w-full text-center shadow-[0_32px_64px_-12px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-500">
            {!showQR ? (
              <>
                <div className="w-20 h-20 bg-orange-100 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">Settle Payment</h3>
                <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] mb-4">Table {settlingOrder.tableNumber || settlingOrder.id}</p>
                <div className="bg-slate-50 rounded-2xl p-6 mb-8 border border-slate-100">
                   <span className="text-slate-400 font-black text-[10px] uppercase tracking-widest block mb-1">Payable Amount</span>
                   <span className="text-3xl font-black text-orange-600">₹{settlingOrder.grandTotal.toFixed(2)}</span>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <button 
                    onClick={() => handleSettlePaid('qr')}
                    className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-white border-2 border-slate-100 hover:border-orange-500 hover:bg-orange-50 transition-all group"
                  >
                    <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1-1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Pay via QR</span>
                  </button>
                  <button 
                    onClick={() => handleSettlePaid('cash')}
                    className="flex flex-col items-center gap-3 p-6 rounded-3xl bg-white border-2 border-slate-100 hover:border-slate-900 hover:bg-slate-50 transition-all group"
                  >
                    <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-slate-600 group-hover:bg-slate-900 group-hover:text-white transition-colors">
                       <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest">Pay via Cash</span>
                  </button>
                </div>

                <button 
                  onClick={() => setShowSettlementModal(false)}
                  className="w-full bg-slate-100 text-slate-500 font-black py-4 rounded-full hover:bg-slate-200 transition-colors text-[10px] uppercase tracking-[0.2em]"
                >
                  Close Window
                </button>
              </>
            ) : (
              /* QR VIEW */
              <>
                <h3 className="text-3xl font-black text-slate-900 tracking-tighter mb-2">Scan & Pay</h3>
                <p className="text-slate-500 font-black text-[10px] uppercase tracking-[0.3em] mb-10">Amount: ₹{settlingOrder.grandTotal.toFixed(2)}</p>
                
                <div className="bg-slate-50 p-8 rounded-[3rem] mb-10 border-2 border-slate-100 ring-8 ring-slate-50">
                  <div className="aspect-square bg-white p-6 rounded-[2rem] shadow-xl flex items-center justify-center">
                    <img 
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=upi://pay?pa=spiceroute@bank&pn=SpiceRoute&am=${settlingOrder.grandTotal}&cu=INR`} 
                      alt="Payment QR" 
                      className="w-full h-full"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <button 
                    onClick={() => handleSettlePaid('qr')}
                    className="w-full bg-green-600 text-white font-black py-6 rounded-[2.5rem] shadow-2xl shadow-green-200 hover:bg-green-700 transition-all text-sm uppercase tracking-[0.2em] active:scale-95"
                  >
                    Confirm Paid
                  </button>
                  <button 
                    onClick={() => setShowQR(false)}
                    className="w-full bg-white text-slate-400 font-black py-4 rounded-full hover:bg-slate-50 transition-colors text-[10px] uppercase tracking-[0.2em]"
                  >
                    Back to Selection
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Print-only Hidden Template */}
      {lastOrder && (
        <div className="print-only fixed inset-0 bg-white p-10 font-mono text-xs leading-relaxed">
          <div className="text-center border-b-2 border-black pb-4 mb-4">
            <h1 className="text-2xl font-bold uppercase tracking-widest">SpiceRoute</h1>
            <p>123 South Indian Lane, Gastro City</p>
            <p>GSTIN: 29AABCDE1234F1Z</p>
            <p>TEL: +91 9876543210</p>
          </div>
          
          <div className="flex justify-between mb-4 font-bold border-b border-black pb-2">
            <div>
              <p>ORDER: {lastOrder.id}</p>
              <p>TYPE: {lastOrder.type.toUpperCase()}</p>
              {lastOrder.tableNumber && <p>TABLE: {lastOrder.tableNumber}</p>}
            </div>
            <div className="text-right">
              <p>{new Date(lastOrder.date).toLocaleDateString()}</p>
              <p>{new Date(lastOrder.date).toLocaleTimeString()}</p>
            </div>
          </div>

          <table className="w-full mb-6">
            <thead>
              <tr className="border-b-2 border-black text-left">
                <th className="py-2">ITEM</th>
                <th className="py-2 text-center">QTY</th>
                <th className="py-2 text-right">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              {lastOrder.items.map((item, idx) => (
                <tr key={idx} className="border-b border-gray-200">
                  <td className="py-2">{item.name}</td>
                  <td className="py-2 text-center">{item.quantity}</td>
                  <td className="py-2 text-right">₹{(item.price * item.quantity).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="border-t-2 border-black pt-4 space-y-2">
            <div className="flex justify-between font-bold">
              <span>SUBTOTAL</span>
              <span>₹{lastOrder.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-black border-t-4 border-double border-black pt-2">
              <span>GRAND TOTAL</span>
              <span>₹{lastOrder.grandTotal.toFixed(2)}</span>
            </div>
          </div>

          <div className="text-center mt-12 pt-8 border-t border-dotted border-black">
            <p className="font-bold">THANK YOU FOR YOUR VISIT!</p>
            <p className="text-[10px] mt-2">Prices inclusive of all taxes.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSView;
