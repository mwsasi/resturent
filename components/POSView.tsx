
import React, { useState, useEffect, useRef } from 'react';
import { MenuItem, CartItem, Order, ItemVariation } from '../types';
import { getChefRecommendation } from '../services/gemini';

interface POSViewProps {
  menu: MenuItem[];
  cart: CartItem[];
  orders: Order[];
  addToCart: (item: MenuItem, variation?: ItemVariation, quantity?: number) => void;
  updateQuantity: (cartKey: string, delta: number) => void;
  removeFromCart: (cartKey: string) => void;
  clearCart: () => void;
  completeOrder: (type: 'dine-in' | 'takeaway', tableNumber?: string) => Order | undefined;
  appendItemsToOrder: (orderId: string) => Order | undefined;
  updateOrderStatus: (orderId: string, status: Order['status'], paymentMethod?: Order['paymentMethod']) => void;
}

const POSView: React.FC<POSViewProps> = ({ 
  menu, cart, orders, addToCart, updateQuantity, removeFromCart, 
  clearCart, completeOrder, appendItemsToOrder, updateOrderStatus
}) => {
  const [activeTab, setActiveTab] = useState<'menu' | 'orders'>('menu');
  const [chefPick, setChefPick] = useState<string>("Supreme's Special...");
  const [orderType, setOrderType] = useState<'dine-in' | 'takeaway'>('dine-in');
  const [tableNumber, setTableNumber] = useState('');
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [settlingOrderId, setSettlingOrderId] = useState<string | null>(null);
  const [showCartMobile, setShowCartMobile] = useState(false);
  
  // Selection Logic
  const [selectingItem, setSelectingItem] = useState<MenuItem | null>(null);
  const [selectionQty, setSelectionQty] = useState(1);
  const [selectedVar, setSelectedVar] = useState<ItemVariation | undefined>(undefined);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchRec = async () => {
      const names = menu.map(m => m.name);
      if (names.length > 0) {
        const rec = await getChefRecommendation(names);
        setChefPick(rec);
      }
    };
    fetchRec();
  }, [menu]);

  const grandTotal = cart.reduce((acc, item) => {
    const price = item.selectedVariation ? item.selectedVariation.price : item.price;
    return acc + (price * item.quantity);
  }, 0);

  const pendingOrders = orders.filter(o => o.status !== 'delivered');

  const scroll = (dir: 'up' | 'down') => {
    if (scrollRef.current) {
      const top = scrollRef.current.scrollTop;
      scrollRef.current.scrollTo({
        top: dir === 'up' ? top - 250 : top + 250,
        behavior: 'smooth'
      });
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
    setShowCartMobile(false);
  };

  const startSelection = (item: MenuItem) => {
    setSelectingItem(item);
    setSelectionQty(1);
    setSelectedVar(undefined);
  };

  const confirmSelection = () => {
    if (!selectingItem) return;
    addToCart(selectingItem, selectedVar, selectionQty);
    setSelectingItem(null);
  };

  const CashIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
    </svg>
  );

  const QRIcon = () => (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM13 13h2v2h-2v-2zm2 2h2v2h-2v-2zm2-2h2v2h-2v-2zm2 2h2v2h-2v-2zm-2 2h2v2h-2v-2zm0-4h2v2h-2v-2zm-2 2h2v2h-2v-2zm0 2h2v2h-2v-2z"/>
    </svg>
  );

  const itemUnitPrice = selectedVar ? selectedVar.price : (selectingItem?.price || 0);
  const selectionTotal = itemUnitPrice * selectionQty;

  return (
    <div className="h-full flex flex-col md:flex-row overflow-hidden relative bg-slate-100">
      
      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Mobile Tab Switcher */}
        <div className="flex bg-white border-b px-3 py-1.5 gap-2 shrink-0 z-10 shadow-sm">
          <button 
            onClick={() => setActiveTab('menu')}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all ${activeTab === 'menu' ? 'bg-orange-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}
          >
            Menu
          </button>
          <button 
            onClick={() => setActiveTab('orders')}
            className={`flex-1 py-1.5 rounded-lg text-[11px] font-black uppercase transition-all relative ${activeTab === 'orders' ? 'bg-orange-600 text-white shadow-sm' : 'bg-slate-100 text-slate-400'}`}
          >
            Active Orders {pendingOrders.length > 0 && <span className="ml-1 bg-white text-orange-600 px-1.5 rounded-full text-[9px]">{pendingOrders.length}</span>}
          </button>
        </div>

        {/* Scrollable Area */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-2 pb-24 md:pb-2 custom-scrollbar relative">
          {activeTab === 'menu' ? (
            <div className="space-y-2">
              <div className="bg-orange-50 border-l-4 border-orange-500 p-2 rounded flex items-center gap-2">
                <span className="font-black text-orange-700 text-[8px] uppercase tracking-widest bg-orange-200 px-1.5 py-0.5 rounded leading-none">Pick</span>
                <span className="text-orange-600 italic text-[10px] font-bold leading-none truncate">{chefPick}</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
                {menu.map(item => {
                  const hasVariations = !!item.variations?.length;
                  const totalStock = hasVariations 
                    ? item.variations!.reduce((acc, v) => acc + v.stock, 0)
                    : item.stock;
                  const outOfStock = totalStock <= 0;
                  
                  return (
                    <div 
                      key={item.id} 
                      onClick={() => !outOfStock && startSelection(item)}
                      className={`bg-white rounded-xl border-2 border-slate-200 overflow-hidden flex flex-col transition-all active:scale-95 ${outOfStock ? 'opacity-40 grayscale pointer-events-none' : 'hover:border-orange-500 cursor-pointer'}`}
                    >
                      <div className="h-20 bg-slate-50 relative shrink-0">
                        {item.image ? (
                          <img src={item.image} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-slate-200 font-black text-3xl">{item.name[0]}</div>
                        )}
                        <div className="absolute top-1 right-1 flex flex-col gap-1 items-end">
                          <span className="bg-slate-900 text-white px-2 py-0.5 rounded-lg text-[11px] font-black shadow-lg">Rs{hasVariations ? `${Math.min(...item.variations!.map(v => v.price))}+` : item.price}</span>
                          {item.piecesPerSet && item.piecesPerSet > 1 && <span className="bg-orange-600 text-white px-1.5 rounded-md text-[7px] font-black uppercase">SET OF {item.piecesPerSet}</span>}
                        </div>
                        <div className={`absolute bottom-1 left-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase shadow-sm ${totalStock <= 5 ? 'bg-red-600 text-white' : 'bg-white/90 text-slate-900 border'}`}>
                          Stock: {totalStock}
                        </div>
                      </div>
                      <div className="p-2 flex-1 flex flex-col justify-center">
                        <h3 className="text-[13px] font-black text-slate-900 leading-[1.1] mb-0.5 break-words uppercase tracking-tighter">{item.name}</h3>
                        <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{item.category}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {pendingOrders.map(order => (
                <div key={order.id} className="bg-white rounded-xl border-2 border-slate-200 p-3 relative flex flex-col gap-2">
                   <div className={`absolute top-0 right-0 px-2 py-1 text-[7px] font-black uppercase text-white rounded-bl-lg flex items-center gap-1.5 ${order.type === 'dine-in' ? 'bg-green-600' : 'bg-red-600'}`}>
                     {order.type === 'dine-in' ? (
                       <svg className="w-2.1 h-2.1" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><circle cx="12" cy="12" r="5"/></svg>
                     ) : (
                       <svg className="w-2.1 h-2.1" fill="currentColor" viewBox="0 0 24 24"><path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-8-2h4v2h-4V4zM4 19V8h16v11H4z"/></svg>
                     )}
                     {order.type} {order.tableNumber && `#${order.tableNumber}`}
                   </div>
                   
                   {order.paymentMethod && (
                     <div className={`absolute top-0 left-0 px-2 py-1 text-[7px] font-black uppercase text-white rounded-br-lg flex items-center gap-1.5 ${order.paymentMethod === 'cash' ? 'bg-emerald-600' : 'bg-indigo-600'}`}>
                       {order.paymentMethod === 'cash' ? <CashIcon /> : <QRIcon />}
                       {order.paymentMethod}
                     </div>
                   )}

                   <div className="pt-3">
                      <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{new Date(order.date).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} • {order.id.slice(-4)}</p>
                      <div className="mt-1.5 space-y-1">
                        {order.items.map((it, idx) => (
                          <div key={idx} className="flex justify-between text-[10px] text-slate-800">
                             <span className="truncate pr-2 font-black uppercase">{it.quantity}x {it.name} {it.selectedVariation?.label && `(${it.selectedVariation.label})`}</span>
                             <span className="font-black shrink-0">Rs{(it.selectedVariation?.price || it.price) * it.quantity}</span>
                          </div>
                        ))}
                      </div>
                   </div>
                   <div className="mt-auto pt-2 border-t flex items-center justify-between">
                      <span className="text-[11px] font-black uppercase tracking-widest">Total: Rs{order.grandTotal}</span>
                      <div className="flex gap-1.5">
                        <button onClick={() => { setEditingOrderId(order.id); setActiveTab('menu'); setOrderType(order.type); clearCart(); }} className="px-2 py-1 bg-slate-100 text-[8px] font-black uppercase rounded-md tracking-widest">Edit</button>
                        <button onClick={() => setSettlingOrderId(order.id)} className="px-3 py-1 bg-orange-600 text-white text-[8px] font-black uppercase rounded-md shadow-md tracking-widest">Settle</button>
                      </div>
                   </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Up/Down Floating Scroll Controls */}
        <div className="absolute right-4 bottom-24 md:bottom-6 flex flex-col gap-2 z-20 no-print">
           <button onClick={() => scroll('up')} className="w-10 h-10 rounded-full bg-slate-900/95 backdrop-blur shadow-2xl flex items-center justify-center border border-white/10 text-white active:bg-orange-500 transition-colors">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 15l7-7 7 7"/></svg>
           </button>
           <button onClick={() => scroll('down')} className="w-10 h-10 rounded-full bg-slate-900/95 backdrop-blur shadow-2xl flex items-center justify-center border border-white/10 text-white active:bg-orange-500 transition-colors">
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7"/></svg>
           </button>
        </div>
      </div>

      {/* Mobile BOTTOM Checkout Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900 text-white z-[60] shadow-[0_-8px_30px_rgba(0,0,0,0.12)] border-t border-white/10">
        <button 
          onClick={() => setShowCartMobile(!showCartMobile)}
          className={`w-full py-4 flex items-center justify-between px-6 transition-all active:bg-slate-800 ${editingOrderId ? 'bg-green-700' : ''}`}
        >
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center transition-all ${showCartMobile ? 'bg-white text-slate-900 rotate-180' : 'bg-orange-500 text-white'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
            </div>
            <div className="text-left">
              <span className="block text-[8px] font-black uppercase tracking-[0.2em] opacity-60 leading-none mb-1">Items in Cart</span>
              <span className="text-[12px] font-black uppercase leading-tight">{editingOrderId ? 'Updating Order...' : `${cart.length} Dish Selected`}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
               <span className="block text-[18px] font-black tracking-tighter">Rs{grandTotal}</span>
               <span className="block text-[8px] font-black opacity-60 uppercase">Tap to view</span>
            </div>
            <svg className={`w-5 h-5 transition-transform ${showCartMobile ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 15l7-7 7 7"/></svg>
          </div>
        </button>
      </div>

      {/* Mobile Cart Overlay */}
      <div className={`
        fixed inset-0 z-[45] bg-slate-900/80 backdrop-blur-sm transition-opacity md:hidden ${showCartMobile ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `} onClick={() => setShowCartMobile(false)} />
      
      <div className={`
        fixed bottom-0 left-0 right-0 z-[55] bg-white shadow-2xl transition-transform duration-300 transform md:relative md:top-0 md:translate-y-0 md:z-auto md:w-64 lg:w-80 md:bg-white md:border-l md:flex md:flex-col
        ${showCartMobile ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
        rounded-t-[2.5rem] md:rounded-none overflow-hidden
      `}>
        <div className="md:hidden w-12 h-1.5 bg-slate-200 rounded-full mx-auto mt-3 mb-1" />

        <div className="p-4 pt-2 border-b flex items-center justify-between bg-slate-50/50">
           <div className="flex items-center gap-2">
             <div className="w-7 h-7 rounded-lg bg-slate-900 text-white flex items-center justify-center">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
             </div>
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">Review Items</span>
           </div>
           <button onClick={() => setShowCartMobile(false)} className="md:hidden bg-slate-100 text-slate-400 hover:text-slate-900 rounded-full w-8 h-8 flex items-center justify-center text-[10px] font-black transition-colors">✕</button>
        </div>

        <div className="max-h-[60vh] md:flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-slate-300 gap-3">
               <svg className="w-12 h-12 opacity-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
               <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Your cart is empty</span>
            </div>
          ) : (
            cart.map((item, idx) => {
              const cartKey = item.selectedVariation ? `${item.id}-${item.selectedVariation.id}` : item.id;
              const unitPrice = item.selectedVariation?.price || item.price;
              return (
                <div key={idx} className="flex gap-4 items-center animate-in slide-in-from-bottom-4 duration-300">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-[13px] font-black truncate text-slate-900 uppercase tracking-tighter">{item.name}</h4>
                    <p className="text-[9px] font-black text-orange-600 uppercase tracking-wider leading-none mb-2">{item.selectedVariation?.label || (item.piecesPerSet ? `${item.piecesPerSet} pcs set` : 'Standard Portion')}</p>
                    <div className="flex items-center gap-3">
                       <button onClick={() => updateQuantity(cartKey, -1)} className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-[14px] font-black active:bg-slate-200 transition-colors">－</button>
                       <span className="text-[12px] font-black w-6 text-center">{item.quantity}</span>
                       <button onClick={() => updateQuantity(cartKey, 1)} className="w-8 h-8 bg-slate-100 rounded-xl flex items-center justify-center text-[14px] font-black active:bg-slate-200 transition-colors">＋</button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[14px] font-black text-slate-900">Rs{unitPrice * item.quantity}</p>
                    <button onClick={() => removeFromCart(cartKey)} className="text-[9px] text-red-500 font-black uppercase tracking-widest mt-1.5 active:opacity-60 transition-opacity">Remove</button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="p-6 bg-slate-50 border-t pb-24 md:pb-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
             <button 
               onClick={() => setOrderType('dine-in')} 
               className={`flex flex-col items-center justify-center py-4 rounded-[1.5rem] border-2 transition-all ${orderType === 'dine-in' ? 'bg-orange-600 border-orange-600 text-white shadow-xl shadow-orange-100' : 'bg-white border-slate-200 text-slate-400'}`}
             >
                <svg className="w-6 h-6 mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/><circle cx="12" cy="12" r="5"/></svg>
                <span className="text-[10px] font-black uppercase tracking-widest">Dine-In</span>
             </button>
             <button 
               onClick={() => setOrderType('takeaway')} 
               className={`flex flex-col items-center justify-center py-4 rounded-[1.5rem] border-2 transition-all ${orderType === 'takeaway' ? 'bg-slate-900 border-slate-900 text-white shadow-xl shadow-slate-200' : 'bg-white border-slate-200 text-slate-400'}`}
             >
                <svg className="w-6 h-6 mb-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>
                <span className="text-[10px] font-black uppercase tracking-widest">Takeaway</span>
             </button>
          </div>

          {orderType === 'dine-in' && (
            <div className="relative mb-6 animate-in slide-in-from-top-4">
              <span className="absolute left-5 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-300 uppercase tracking-widest">TABLE</span>
              <input 
                type="text" placeholder="NO." value={tableNumber} onChange={e => setTableNumber(e.target.value)}
                className="w-full bg-white border-2 border-slate-200 rounded-[1.25rem] pl-20 pr-5 py-4 text-[14px] font-black outline-none focus:border-orange-500 transition-all"
              />
            </div>
          )}

          <div className="flex justify-between items-center mb-6 px-1">
             <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Final Total</span>
             <span className="text-3xl font-black text-slate-900 tracking-tighter">Rs{grandTotal}</span>
          </div>
          
          <button 
            disabled={cart.length === 0} onClick={handlePunchOrder}
            className={`w-full py-5 rounded-[1.5rem] text-white font-black text-[13px] uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95 disabled:opacity-30 disabled:grayscale ${editingOrderId ? 'bg-green-600' : 'bg-orange-600'}`}
          >
            {editingOrderId ? 'Update Current Order' : 'Confirm & Place Order'}
          </button>
          {editingOrderId && (
            <button onClick={() => { setEditingOrderId(null); clearCart(); }} className="w-full mt-4 text-[10px] font-black uppercase text-slate-400 tracking-widest hover:text-red-500 transition-colors">Discard All Changes</button>
          )}
        </div>
      </div>

      {/* Select Quantity & Variation Modal */}
      {selectingItem && (
        <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-md z-[110] flex items-end md:items-center md:justify-center p-4 overflow-y-auto">
          <div className="bg-white w-full md:max-w-[420px] rounded-[2.5rem] p-8 shadow-2xl animate-in slide-in-from-bottom-20 max-h-[90vh] flex flex-col">
             <div className="flex items-center gap-4 mb-6">
                <div className="w-16 h-16 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-200">
                  {selectingItem.image ? <img src={selectingItem.image} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center font-black text-slate-400">{selectingItem.name[0]}</div>}
                </div>
                <div>
                   <h3 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-tight">{selectingItem.name}</h3>
                   <p className="text-[9px] text-slate-400 uppercase font-bold tracking-widest">{selectingItem.category} • Set of {selectingItem.piecesPerSet || 1}</p>
                </div>
             </div>

             <div className="flex-1 overflow-y-auto custom-scrollbar space-y-8 pr-2">
                {selectingItem.variations && selectingItem.variations.length > 0 && (
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Choose Variation</label>
                    <div className="grid grid-cols-2 gap-2">
                       {selectingItem.variations.map(v => (
                         <button 
                           key={v.id} 
                           onClick={() => setSelectedVar(v)}
                           disabled={v.stock <= 0}
                           className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-start gap-1 relative overflow-hidden ${selectedVar?.id === v.id ? 'bg-orange-50 border-orange-600 ring-2 ring-orange-200' : 'bg-white border-slate-100'} ${v.stock <= 0 ? 'opacity-30 grayscale cursor-not-allowed' : 'hover:border-orange-300'}`}
                         >
                           <span className={`text-[11px] font-black uppercase tracking-tight ${selectedVar?.id === v.id ? 'text-orange-700' : 'text-slate-800'}`}>{v.label}</span>
                           <span className={`text-[12px] font-black ${selectedVar?.id === v.id ? 'text-orange-600' : 'text-slate-400'}`}>Rs{v.price}</span>
                           {v.stock <= 5 && v.stock > 0 && <span className="absolute top-1 right-2 text-[6px] font-black uppercase text-red-500">Low Stock</span>}
                         </button>
                       ))}
                    </div>
                  </div>
                )}

                <div>
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 block">Input Quantity</label>
                   <div className="flex items-center justify-between bg-slate-100 p-3 rounded-3xl">
                      <button 
                        onClick={() => setSelectionQty(Math.max(1, selectionQty - 1))}
                        className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-xl font-black active:scale-90 transition-transform text-slate-900 border"
                      >
                        －
                      </button>
                      <input 
                        type="number" 
                        value={selectionQty} 
                        onChange={(e) => setSelectionQty(Math.max(1, parseInt(e.target.value) || 1))}
                        className="w-20 bg-transparent text-center text-3xl font-black text-slate-900 outline-none"
                      />
                      <button 
                        onClick={() => setSelectionQty(selectionQty + 1)}
                        className="w-14 h-14 rounded-2xl bg-white shadow-sm flex items-center justify-center text-xl font-black active:scale-90 transition-transform text-slate-900 border"
                      >
                        ＋
                      </button>
                   </div>
                </div>
             </div>

             <div className="mt-8 pt-6 border-t space-y-4">
                <div className="flex justify-between items-end">
                   <div className="text-left">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Total Amount</p>
                      <p className="text-2xl font-black text-slate-900 tracking-tighter">Rs{selectionTotal}</p>
                   </div>
                   <div className="text-right">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">Subtotal</p>
                      <p className="text-[12px] font-black text-orange-600 uppercase tracking-widest">Rs{itemUnitPrice} × {selectionQty}</p>
                   </div>
                </div>
                
                <div className="flex gap-2">
                   <button 
                    onClick={() => setSelectingItem(null)}
                    className="flex-1 py-4 rounded-2xl bg-slate-100 text-slate-500 text-[11px] font-black uppercase tracking-widest"
                   >
                     Discard
                   </button>
                   <button 
                    disabled={selectingItem.variations && selectingItem.variations.length > 0 && !selectedVar}
                    onClick={confirmSelection}
                    className="flex-[2] py-4 rounded-2xl bg-orange-600 text-white text-[11px] font-black uppercase tracking-widest shadow-xl shadow-orange-100 disabled:opacity-30 disabled:grayscale transition-all active:scale-95"
                   >
                     Add to Cart
                   </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Settle Bill Modal */}
      {settlingOrderId && (
        <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-xl z-[120] flex items-center justify-center p-4">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-[340px] text-center shadow-2xl animate-in zoom-in-95">
             <div className="w-20 h-20 bg-green-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-green-600">
               <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
             </div>
             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-2">Checkout Bill</p>
             <h3 className="text-3xl font-black text-slate-900 mb-8 tracking-tighter">Rs{orders.find(o => o.id === settlingOrderId)?.grandTotal}</h3>
             <div className="grid grid-cols-1 gap-4 mb-8">
                <button 
                  onClick={() => { updateOrderStatus(settlingOrderId, 'delivered', 'qr'); setSettlingOrderId(null); }} 
                  className="w-full bg-orange-600 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl shadow-orange-200 transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <QRIcon /> Online / QR Scan
                </button>
                <button 
                  onClick={() => { updateOrderStatus(settlingOrderId, 'delivered', 'cash'); setSettlingOrderId(null); }} 
                  className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[11px] uppercase tracking-widest transition-transform active:scale-95 flex items-center justify-center gap-2"
                >
                  <CashIcon /> Cash Settlement
                </button>
             </div>
             <button onClick={() => setSettlingOrderId(null)} className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Return to Menu</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default POSView;
