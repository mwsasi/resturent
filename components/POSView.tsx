
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
          <div>
            <span className="font-bold text-orange-700">Chef's Special: </span>
            <span className="text-orange-600 italic text-sm">{chefPick}</span>
          </div>
          <button onClick={() => {/* Refetch logic could go here */}} className="text-orange-400 hover:text-orange-600">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto pb-8">
          {menu.map(item => (
            <div 
              key={item.id} 
              onClick={() => addToCart(item)}
              className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden cursor-pointer hover:shadow-md transition-shadow active:scale-95 duration-75"
            >
              <div className="h-32 bg-slate-200 overflow-hidden">
                <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
              </div>
              <div className="p-3">
                <h3 className="font-bold text-slate-800">{item.name}</h3>
                <p className="text-xs text-slate-500 line-clamp-1 mb-2">{item.description}</p>
                <div className="flex items-center justify-between">
                  <span className="text-orange-600 font-bold">₹{item.price}</span>
                  <div className="bg-orange-100 text-orange-700 p-1.5 rounded-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
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
      <div className="w-full md:w-80 lg:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 flex flex-col no-print">
        <div className="p-4 border-b flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-orange-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            Current Bill
          </h2>
          <button onClick={clearCart} className="text-xs font-semibold text-red-500 hover:text-red-700">Clear All</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50 space-y-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="font-medium">Your cart is empty</p>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-bold text-slate-700">{item.name}</h4>
                  <div className="flex items-center gap-2 mt-1">
                    <button onClick={() => updateQuantity(item.id, -1)} className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">-</button>
                    <span className="text-sm w-4 text-center">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)} className="w-6 h-6 rounded border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-50">+</button>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-slate-800">₹{item.price * item.quantity}</p>
                  <button onClick={() => removeFromCart(item.id)} className="text-[10px] text-red-400 hover:text-red-600">Remove</button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t rounded-b-2xl">
          <div className="space-y-2 mb-4">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-600">
              <span>GST (5%)</span>
              <span>₹{tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-lg font-bold text-slate-800 pt-2 border-t">
              <span>Total</span>
              <span className="text-orange-600">₹{grandTotal.toFixed(2)}</span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2">
            <button 
              disabled={cart.length === 0}
              onClick={handlePay}
              className="flex items-center justify-center gap-2 bg-orange-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-200 hover:bg-orange-700 disabled:opacity-50 disabled:shadow-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
              Pay Now
            </button>
            <button 
              onClick={handlePrint}
              disabled={!lastOrder}
              className="flex items-center justify-center gap-2 bg-slate-800 text-white font-bold py-3 rounded-xl shadow-lg shadow-slate-200 hover:bg-slate-900 disabled:opacity-50 disabled:shadow-none"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print Bill
            </button>
          </div>
        </div>
      </div>

      {/* QR Payment Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl scale-in-center">
            <h3 className="text-xl font-bold text-slate-800 mb-2">Scan & Pay</h3>
            <p className="text-slate-500 text-sm mb-6">UPI Transaction for ₹{grandTotal.toFixed(2)}</p>
            
            <div className="bg-slate-100 p-6 rounded-2xl mb-6 relative">
              <div className="aspect-square bg-white border-8 border-white shadow-inner flex items-center justify-center overflow-hidden">
                <img 
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=upi://pay?pa=restaurant@upi&pn=SpiceRoute&am=${grandTotal}&cu=INR`} 
                  alt="Payment QR" 
                  className="w-full h-full"
                />
              </div>
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white rounded-lg shadow-md p-2">
                <img src="https://picsum.photos/seed/spice/100/100" alt="Logo" className="w-full h-full rounded" />
              </div>
            </div>

            <div className="space-y-3">
              <button 
                onClick={handleConfirmPayment}
                className="w-full bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-green-100 hover:bg-green-700"
              >
                Confirm Payment
              </button>
              <button 
                onClick={() => setShowQR(false)}
                className="w-full bg-white text-slate-500 font-semibold py-3 rounded-2xl hover:bg-slate-50 border border-slate-100"
              >
                Go Back
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hidden Print-only Bill */}
      {lastOrder && (
        <div className="print-only fixed inset-0 bg-white p-8">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-black uppercase tracking-widest">SpiceRoute</h1>
            <p className="text-xs">123 Food Street, Tasty City</p>
            <p className="text-xs">Ph: +91 9876543210</p>
            <div className="border-b-2 border-dashed border-slate-300 my-4"></div>
            <h2 className="font-bold">INVOICE</h2>
            <p className="text-[10px]">Date: {new Date(lastOrder.date).toLocaleString()}</p>
            <p className="text-[10px]">Order ID: {lastOrder.id}</p>
          </div>
          <table className="w-full text-sm mb-6">
            <thead>
              <tr className="border-b border-slate-400">
                <th className="text-left py-1">Item</th>
                <th className="text-center py-1">Qty</th>
                <th className="text-right py-1">Price</th>
              </tr>
            </thead>
            <tbody>
              {lastOrder.items.map(item => (
                <tr key={item.id}>
                  <td className="py-1">{item.name}</td>
                  <td className="text-center py-1">{item.quantity}</td>
                  <td className="text-right py-1">₹{item.price * item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="border-t-2 border-dashed border-slate-300 pt-4 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Subtotal</span>
              <span>₹{lastOrder.total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span>GST (5%)</span>
              <span>₹{lastOrder.tax.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t">
              <span>Grand Total</span>
              <span>₹{lastOrder.grandTotal.toFixed(2)}</span>
            </div>
          </div>
          <div className="text-center mt-8 text-[10px] italic">
            Thank you! Come again!
          </div>
        </div>
      )}
    </div>
  );
};

export default POSView;
