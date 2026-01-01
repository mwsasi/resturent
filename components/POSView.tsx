
import React, { useState, useEffect } from 'react';
import { MenuItem, CartItem, Order } from '../types';
import { getChefRecommendation } from '../services/gemini';

interface POSViewProps {
  menu: MenuItem[];
  cart: CartItem[];
  addToCart: (item: MenuItem) => void;
  updateQuantity: (id: string, delta: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  completeOrder: () => Order | undefined;
}

const POSView: React.FC<POSViewProps> = ({ menu, cart, addToCart, updateQuantity, removeFromCart, clearCart, completeOrder }) => {
  const [showQR, setShowQR] = useState(false);
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [chefPick, setChefPick] = useState<string>("Loading Chef's Special...");

  useEffect(() => {
    const fetchRec = async () => {
      const rec = await getChefRecommendation(menu.map(m => m.name));
      setChefPick(rec);
    };
    fetchRec();
  }, [menu]);

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const tax = subtotal * 0.05;
  const grandTotal = subtotal + tax;

  const handlePay = () => {
    if (cart.length === 0) return;
    setShowQR(true);
  };

  const handleConfirmPayment = () => {
    const order = completeOrder();
    if (order) {
      setLastOrder(order);
      setShowQR(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="h-full flex flex-col md:flex-row p-4 gap-4">
      {/* Menu Area */}
      <div className="flex-1 flex flex-col gap-4 no-print overflow-hidden">
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
              className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-xl hover:-translate-y-1 transition-all active:scale-95 duration-200 group"
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
              <div className="p-4">
                <h3 className="font-black text-slate-800 leading-tight mb-1">{item.name}</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter mb-2">{item.category}</p>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3 h-8">{item.description}</p>
                <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Available</span>
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
      </div>

      {/* Cart & Billing Sidebar */}
      <div className="w-full md:w-80 lg:w-96 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100 flex flex-col no-print">
        <div className="p-6 border-b flex items-center justify-between">
          <h2 className="text-xl font-black text-slate-800 tracking-tighter flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Current Check
          </h2>
          <button onClick={clearCart} className="text-[10px] font-black text-red-500 hover:text-red-700 uppercase tracking-widest bg-red-50 px-3 py-1.5 rounded-full">Reset</button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-40 space-y-4">
              <div className="p-8 rounded-full bg-slate-50 border-2 border-dashed border-slate-200">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <p className="font-bold text-sm uppercase tracking-widest">Cart Empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center gap-4 group">
                <div className="w-14 h-14 rounded-2xl bg-slate-100 overflow-hidden shrink-0 border border-slate-50 shadow-sm">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-slate-300">{item.name[0]}</div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-black text-slate-700 truncate">{item.name}</h4>
                  <div className="flex items-center gap-2 mt-1.5">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-7 h-7 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 hover:bg-orange-50 hover:text-orange-600 transition-colors shadow-sm font-black">-</button>
                    <span className="text-xs font-black w-6 text-center text-slate-800">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-7 h-7 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 hover:bg-orange-50 hover:text-orange-600 transition-colors shadow-sm font-black">+</button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-slate-900">₹{item.price * item.quantity}</p>
                  <button onClick={() => removeFromCart(item.id)} className="text-[9px] font-black text-red-400 hover:text-red-600 uppercase tracking-tighter mt-1">Remove</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-8 bg-slate-50/50 border-t rounded-b-[2.5rem]">
          <div className="space-y-3 mb-6">
            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
              <span>Net Total</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
              <span>Service Tax (5%)</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center pt-4 border-t-2 border-dashed border-slate-200">
              <span className="text-sm font-black text-slate-800 uppercase tracking-widest">Grand Total</span>
              <span className="text-2xl font-black text-orange-600">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button 
              disabled={cart.length === 0}
              onClick={handlePay}
              className="flex items-center justify-center gap-2 bg-orange-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-orange-100 hover:bg-orange-700 disabled:opacity-50 disabled:shadow-none transition-all"
            >
              Checkout
            </button>
            <button 
              onClick={handlePrint}
              disabled={!lastOrder}
              className="flex items-center justify-center gap-2 bg-slate-900 text-white font-black py-4 rounded-2xl shadow-xl shadow-slate-100 hover:bg-black disabled:opacity-50 disabled:shadow-none transition-all"
            >
              Print Bill
            </button>
          </div>
        </div>
      </div>

      {/* QR Payment Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-md">
          <div className="bg-white rounded-[3rem] p-10 max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-slate-800 tracking-tighter mb-1">Scan & Pay</h3>
            <p className="text-slate-500 font-bold text-xs uppercase tracking-widest mb-8">₹{grandTotal.toFixed(2)} Invoice</p>
            
            <div className="bg-slate-50 p-6 rounded-3xl mb-8 border border-slate-100">
              <div className="aspect-square bg-white p-4 rounded-2xl shadow-inner flex items-center justify-center border border-slate-100">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=spiceroute@bank&pn=SpiceRoute&am=${grandTotal}&cu=INR`} 
                  alt="Payment QR" 
                  className="w-full h-full"
                />
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleConfirmPayment}
                className="w-full bg-green-600 text-white font-black py-5 rounded-[2rem] shadow-xl shadow-green-100 hover:bg-green-700 transition-all text-sm uppercase tracking-widest"
              >
                Done
              </button>
              <button 
                onClick={() => setShowQR(false)}
                className="w-full bg-white text-slate-400 font-black py-3 rounded-full hover:bg-slate-50 transition-colors text-[10px] uppercase tracking-widest"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print-only Bill */}
      {lastOrder && (
        <div className="print-only fixed inset-0 bg-white p-8">
          <div className="text-center mb-6">
            <h1 className="text-3xl font-black uppercase tracking-tighter text-orange-600">SpiceRoute</h1>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Artisan South Indian Kitchen</p>
            <div className="border-b-4 border-double border-slate-900 my-4"></div>
            <h2 className="font-black text-lg">TAX INVOICE</h2>
            <p className="text-[10px] font-bold">DATE: {new Date(lastOrder.date).toLocaleString()}</p>
            <p className="text-[10px] font-bold">ORDER: {lastOrder.id}</p>
          </div>
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b-2 border-slate-900 text-[10px] font-black uppercase">
                <th className="text-left py-2">Item</th>
                <th className="text-center py-2">Qty</th>
                <th className="text-right py-2">Total</th>
              </tr>
            </thead>
            <tbody className="font-medium">
              {lastOrder.items.map(item => (
                <tr key={item.id}>
                  <td className="py-2">{item.name}</td>
                  <td className="text-center py-2">{item.quantity}</td>
                  <td className="text-right py-2">₹{item.price * item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t-2 border-dashed border-slate-300 pt-4 space-y-2">
            <div className="flex justify-between text-xs font-bold"><span>Subtotal</span> <span>₹{lastOrder.total.toFixed(2)}</span></div>
            <div className="flex justify-between text-xs font-bold"><span>GST (5%)</span> <span>₹{lastOrder.tax.toFixed(2)}</span></div>
            <div className="flex justify-between font-black text-xl pt-4 border-t-4 border-slate-900">
              <span>GRAND TOTAL</span>
              <span>₹{lastOrder.grandTotal.toFixed(2)}</span>
            </div>
          </div>
          <div className="text-center mt-12 text-[10px] font-black uppercase tracking-[0.2em]">
            Thanks for Dining with Us!
          </div>
        </div>
      )}
    </div>
  );
};

export default POSView;
