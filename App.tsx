
import React, { useState, useEffect } from 'react';
import { ViewState, MenuItem, Order, CartItem, ItemVariation } from './types';
import { INITIAL_MENU } from './constants';
import POSView from './components/POSView';
import AdminView from './components/AdminView';
import ReportsView from './components/ReportsView';
import Header from './components/Header';

const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbz4cP09A9ovxTMHjJlp-OVhHIAF3gya6Pc4nUmWOlRVn1_g9ZrLxmTHAMfrgXTy7kcV/exec';

// Helper to get local ISO-like string for consistent date comparison
const getLocalISOString = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000;
  const localISOTime = (new Date(now.getTime() - offset)).toISOString().slice(0, -1);
  return localISOTime;
};

const App: React.FC = () => {
  const [view, setView] = useState<ViewState>('pos');
  const [menu, setMenu] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem('supreme_fc_menu');
    return saved ? JSON.parse(saved) : INITIAL_MENU;
  });
  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem('supreme_fc_orders');
    return saved ? JSON.parse(saved) : [];
  });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [pendingSyncOrder, setPendingSyncOrder] = useState<Order | null>(null);

  useEffect(() => {
    localStorage.setItem('supreme_fc_menu', JSON.stringify(menu));
  }, [menu]);

  useEffect(() => {
    localStorage.setItem('supreme_fc_orders', JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    if (pendingSyncOrder) {
      performSheetSync(pendingSyncOrder);
      setPendingSyncOrder(null);
    }
  }, [pendingSyncOrder, orders]); // Added orders to deps to ensure metrics use latest state

  const calculateDailyMetrics = (dateStr: string, currentOrders: Order[]) => {
    const targetOrders = currentOrders.filter(o => 
      o.status === 'delivered' && o.date.startsWith(dateStr)
    );

    let todayRevenue = 0;
    let totalSoldItems = 0;
    let dineInRev = 0;
    let takeawayRev = 0;
    let cashSales = 0;
    const itemDetailsMap: Record<string, number> = {};

    targetOrders.forEach(o => {
      todayRevenue += o.grandTotal;
      if (o.type === 'dine-in') dineInRev += o.grandTotal;
      else takeawayRev += o.grandTotal;
      
      if (o.paymentMethod === 'cash') cashSales += o.grandTotal;

      o.items.forEach(it => {
        totalSoldItems += it.quantity;
        const key = it.selectedVariation ? `${it.name} (${it.selectedVariation.label})` : it.name;
        itemDetailsMap[key] = (itemDetailsMap[key] || 0) + it.quantity;
      });
    });

    return {
      todayRevenue,
      totalSoldItems,
      dineInRev,
      takeawayRev,
      cashSales,
      itemDetailsMap
    };
  };

  const performSheetSync = async (targetOrder: Order) => {
    try {
      const orderDateOnly = targetOrder.date.split('T')[0];
      const metrics = calculateDailyMetrics(orderDateOnly, orders);

      const payload = {
        date: orderDateOnly, // Explicit date field for better GS organization
        itemname: targetOrder.items.map(i => `${i.quantity}x ${i.name}${i.selectedVariation ? ` (${i.selectedVariation.label})` : ''}`).join(', '),
        lastprice: targetOrder.grandTotal,
        balancestock: menu.map(m => `${m.name}: ${m.variations ? m.variations.map(v => `${v.label}(${v.stock})`).join('/') : m.stock}`).join(' | '),
        todayrevenue: metrics.todayRevenue,
        totalsolditem: metrics.totalSoldItems,
        dinein: metrics.dineInRev,
        takeaway: metrics.takeawayRev,
        cashsales: metrics.cashSales,
        revenuedaily: metrics.todayRevenue,
        dayitemsolddetails: JSON.stringify(metrics.itemDetailsMap),
        timestamp: getLocalISOString()
      };

      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      
      console.log('Automated Sync Success:', payload);
    } catch (err) {
      console.error('Checkout Sync failed:', err);
    }
  };

  const manualSyncReport = async (dateStr: string) => {
    try {
      const metrics = calculateDailyMetrics(dateStr, orders);
      const payload = {
        date: dateStr,
        itemname: `DAILY_SUMMARY_REPORT_${dateStr}`,
        lastprice: metrics.todayRevenue,
        balancestock: menu.map(m => `${m.name}: ${m.variations ? m.variations.map(v => `${v.label}(${v.stock})`).join('/') : m.stock}`).join(' | '),
        todayrevenue: metrics.todayRevenue,
        totalsolditem: metrics.totalSoldItems,
        dinein: metrics.dineInRev,
        takeaway: metrics.takeawayRev,
        cashsales: metrics.cashSales,
        revenuedaily: metrics.todayRevenue,
        dayitemsolddetails: JSON.stringify(metrics.itemDetailsMap),
        timestamp: getLocalISOString()
      };

      await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      });
      
      console.log('Manual Report Sync Success:', payload);
      return true;
    } catch (err) {
      console.error('Manual Report Sync failed:', err);
      return false;
    }
  };

  const updateInventory = (itemsToDecrement: CartItem[]) => {
    setMenu(prevMenu => prevMenu.map(menuItem => {
      const soldItems = itemsToDecrement.filter(i => i.id === menuItem.id);
      if (soldItems.length > 0) {
        let updatedItem = { ...menuItem };
        soldItems.forEach(sold => {
          if (sold.selectedVariation && updatedItem.variations) {
            updatedItem.variations = updatedItem.variations.map(v => 
              v.id === sold.selectedVariation?.id 
                ? { ...v, stock: Math.max(0, v.stock - sold.quantity) }
                : v
            );
          } else {
            updatedItem.stock = Math.max(0, updatedItem.stock - sold.quantity);
          }
        });
        return updatedItem;
      }
      return menuItem;
    }));
  };

  const addToCart = (item: MenuItem, variation?: ItemVariation, quantity: number = 1) => {
    const existingInCart = cart.find(i => 
      variation 
        ? (i.id === item.id && i.selectedVariation?.id === variation.id)
        : (i.id === item.id && !i.selectedVariation)
    );
    const currentQtyInCart = existingInCart ? existingInCart.quantity : 0;
    const availableStock = variation ? variation.stock : item.stock;
    if (currentQtyInCart + quantity > availableStock) {
      alert(`Stock limit reached for ${item.name}. Only ${availableStock - currentQtyInCart} remaining.`);
      return;
    }
    setCart(prev => {
      if (existingInCart) {
        return prev.map(i => {
          const isMatch = variation 
            ? (i.id === item.id && i.selectedVariation?.id === variation.id)
            : (i.id === item.id && !i.selectedVariation);
          return isMatch ? { ...i, quantity: i.quantity + quantity } : i;
        });
      }
      return [...prev, { ...item, quantity: quantity, selectedVariation: variation }];
    });
  };

  const removeFromCart = (cartKey: string) => {
    setCart(prev => prev.filter(item => {
      const currentKey = item.selectedVariation ? `${item.id}-${item.selectedVariation.id}` : item.id;
      return currentKey !== cartKey;
    }));
  };

  const updateQuantity = (cartKey: string, delta: number) => {
    setCart(prev => prev.map(i => {
      const currentKey = i.selectedVariation ? i.selectedVariation.id : i.id;
      // Fixed: CurrentKey check for variations
      const actualKey = i.selectedVariation ? `${i.id}-${i.selectedVariation.id}` : i.id;
      if (actualKey === cartKey) {
        const menuItem = menu.find(m => m.id === i.id);
        const availableStock = i.selectedVariation ? i.selectedVariation.stock : (menuItem?.stock || 0);
        if (delta > 0 && i.quantity >= availableStock) return i;
        return { ...i, quantity: Math.max(1, i.quantity + delta) };
      }
      return i;
    }));
  };

  const clearCart = () => setCart([]);

  const completeOrder = (type: 'dine-in' | 'takeaway', tableNumber?: string) => {
    if (cart.length === 0) return;
    const subtotal = cart.reduce((acc, item) => {
      const price = item.selectedVariation ? item.selectedVariation.price : item.price;
      return acc + (price * item.quantity);
    }, 0);
    const newOrder: Order = {
      id: `ORD-${Date.now()}`,
      items: [...cart],
      total: subtotal,
      tax: 0,
      grandTotal: subtotal,
      date: getLocalISOString(), // Fixed: Use local time
      status: 'pending',
      type: type,
      tableNumber: tableNumber
    };
    updateInventory(cart);
    setOrders(prev => [newOrder, ...prev]);
    clearCart();
    return newOrder;
  };

  const appendItemsToOrder = (orderId: string) => {
    if (cart.length === 0) return;
    setOrders(prev => prev.map(order => {
      if (order.id === orderId) {
        const updatedItems = [...order.items];
        cart.forEach(newItem => {
          const existingIndex = updatedItems.findIndex(i => 
            newItem.selectedVariation 
              ? (i.id === newItem.id && i.selectedVariation?.id === newItem.selectedVariation.id)
              : (i.id === newItem.id && !i.selectedVariation)
          );
          if (existingIndex > -1) {
            updatedItems[existingIndex] = {
              ...updatedItems[existingIndex],
              quantity: updatedItems[existingIndex].quantity + newItem.quantity
            };
          } else {
            updatedItems.push({ ...newItem });
          }
        });
        const newSubtotal = updatedItems.reduce((acc, i) => {
          const price = i.selectedVariation ? i.selectedVariation.price : i.price;
          return acc + (price * i.quantity);
        }, 0);
        return { ...order, items: updatedItems, total: newSubtotal, grandTotal: newSubtotal };
      }
      return order;
    }));
    updateInventory(cart);
    clearCart();
    return orders.find(o => o.id === orderId);
  };

  const updateOrderStatus = (orderId: string, status: Order['status'], paymentMethod?: Order['paymentMethod']) => {
    setOrders(prev => {
      const newOrders = prev.map(order => 
        order.id === orderId ? { ...order, status, paymentMethod: paymentMethod || order.paymentMethod } : order
      );
      if (status === 'delivered') {
        const settledOrder = newOrders.find(o => o.id === orderId);
        if (settledOrder) setPendingSyncOrder(settledOrder);
      }
      return newOrders;
    });
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Header currentView={view} setView={setView} />
      <main className="flex-1 overflow-hidden bg-slate-100">
        {view === 'pos' && (
          <POSView 
            menu={menu} cart={cart} orders={orders}
            addToCart={addToCart} updateQuantity={updateQuantity}
            removeFromCart={removeFromCart} clearCart={clearCart}
            completeOrder={completeOrder} appendItemsToOrder={appendItemsToOrder}
            updateOrderStatus={updateOrderStatus}
          />
        )}
        {view === 'admin' && <AdminView menu={menu} setMenu={setMenu} />}
        {view === 'reports' && <ReportsView orders={orders} onSyncReport={manualSyncReport} />}
      </main>
      <footer className="bg-white border-t py-1 px-4 text-center text-[10px] text-slate-400 no-print flex items-center justify-center gap-2">
        <span className="font-bold">SUPREME FOOD COURT</span>
        <span className="opacity-50">v2.4.0 (Date Fix Enabled)</span>
      </footer>
    </div>
  );
};

export default App;
