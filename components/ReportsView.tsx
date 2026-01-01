
import React, { useMemo, useState } from 'react';
import { Order } from '../types';
import { 
  ResponsiveContainer,
  AreaChart,
  Area,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from 'recharts';

interface ReportsViewProps {
  orders: Order[];
}

interface ItemSaleDetail {
  name: string;
  quantity: number;
}

type ChartPeriod = 'hourly' | 'daily' | 'monthly';

const ReportsView: React.FC<ReportsViewProps> = ({ orders }) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  });
  const [activeChartPeriod, setActiveChartPeriod] = useState<ChartPeriod>('hourly');

  const reportData = useMemo(() => {
    const dateObj = new Date(selectedDate);
    const selYear = dateObj.getFullYear();
    const selMonth = dateObj.getMonth();
    const selDay = dateObj.getDate();

    // 1. Daily Metrics (for the specific selectedDate)
    const targetDayOrders = orders.filter(o => {
      const oDate = new Date(o.date);
      return oDate.getFullYear() === selYear && 
             oDate.getMonth() === selMonth && 
             oDate.getDate() === selDay &&
             o.status === 'delivered';
    });

    let totalRevenue = 0;
    let totalItems = 0;
    let dineInCount = 0, dineInRevenue = 0;
    let takeawayCount = 0, takeawayRevenue = 0;
    let cashCount = 0, cashRevenue = 0;
    let qrCount = 0, qrRevenue = 0;
    const itemSalesMap: Record<string, number> = {};
    const hourlyData = Array.from({ length: 24 }, (_, i) => ({ label: `${i}:00`, revenue: 0 }));

    targetDayOrders.forEach(order => {
      totalRevenue += order.grandTotal;
      const hour = new Date(order.date).getHours();
      hourlyData[hour].revenue += order.grandTotal;
      
      if (order.type === 'dine-in') { dineInCount++; dineInRevenue += order.grandTotal; }
      else { takeawayCount++; takeawayRevenue += order.grandTotal; }

      if (order.paymentMethod === 'cash') { cashCount++; cashRevenue += order.grandTotal; }
      else if (order.paymentMethod === 'qr') { qrCount++; qrRevenue += order.grandTotal; }

      order.items.forEach(item => {
        totalItems += item.quantity;
        const itemName = item.selectedVariation ? `${item.name} (${item.selectedVariation.label})` : item.name;
        itemSalesMap[itemName] = (itemSalesMap[itemName] || 0) + item.quantity;
      });
    });

    const itemBreakdown: ItemSaleDetail[] = Object.entries(itemSalesMap)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity);

    // 2. Daily Flow (for the whole month of the selectedDate)
    const daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();
    const dailyData = Array.from({ length: daysInMonth }, (_, i) => ({ label: `${i + 1}`, revenue: 0 }));
    
    orders.filter(o => {
      const oDate = new Date(o.date);
      return oDate.getFullYear() === selYear && oDate.getMonth() === selMonth && o.status === 'delivered';
    }).forEach(order => {
      const dayIndex = new Date(order.date).getDate() - 1;
      dailyData[dayIndex].revenue += order.grandTotal;
    });

    // 3. Monthly Flow (for the whole year of the selectedDate)
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = monthNames.map(name => ({ label: name, revenue: 0 }));
    
    orders.filter(o => {
      const oDate = new Date(o.date);
      return oDate.getFullYear() === selYear && o.status === 'delivered';
    }).forEach(order => {
      const monthIndex = new Date(order.date).getMonth();
      monthlyData[monthIndex].revenue += order.grandTotal;
    });

    return {
      totalRevenue, totalItemsSold: totalItems, orderCount: targetDayOrders.length,
      dineInCount, dineInRevenue, takeawayCount, takeawayRevenue,
      cashCount, cashRevenue, qrCount, qrRevenue,
      itemBreakdown, hourlyData, dailyData, monthlyData
    };
  }, [orders, selectedDate]);

  const currentChartData = activeChartPeriod === 'hourly' 
    ? reportData.hourlyData 
    : activeChartPeriod === 'daily' 
      ? reportData.dailyData 
      : reportData.monthlyData;

  const chartLabelPrefix = activeChartPeriod === 'hourly' ? 'Hour' : activeChartPeriod === 'daily' ? 'Day' : 'Month';

  return (
    <div className="p-4 max-w-6xl mx-auto h-full overflow-y-auto space-y-4 custom-scrollbar pb-24">
      <div className="flex flex-col gap-2 no-print">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Supreme Analytics</h2>
        <div className="flex gap-2">
          <input 
            type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none"
          />
          <button onClick={() => window.print()} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-black">PRINT</button>
        </div>
      </div>

      {/* Main Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 no-print">
        <div className="bg-orange-600 p-4 rounded-2xl text-white shadow-lg">
          <p className="text-[7px] font-black uppercase opacity-60 mb-1">Today Revenue</p>
          <p className="text-xl font-black">Rs{reportData.totalRevenue}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200">
          <p className="text-[7px] font-black text-slate-400 uppercase mb-1">Orders Served</p>
          <p className="text-xl font-black text-slate-800">{reportData.orderCount}</p>
        </div>
        <div className="bg-slate-900 p-4 rounded-2xl text-white shadow-lg">
          <p className="text-[7px] font-black uppercase opacity-60 mb-1">Total Sold Items</p>
          <p className="text-xl font-black">{reportData.totalItemsSold}</p>
        </div>
      </div>

      {/* Order & Payment Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 no-print">
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white p-4 rounded-2xl border-2 border-green-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Dine-In</p>
              </div>
              <p className="text-lg font-black text-slate-900 leading-tight">Rs{reportData.dineInRevenue}</p>
            </div>
            <p className="text-[9px] font-black text-green-600 uppercase mt-2">{reportData.dineInCount} Orders</p>
          </div>
          <div className="bg-white p-4 rounded-2xl border-2 border-blue-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">Takeaway</p>
              </div>
              <p className="text-lg font-black text-slate-900 leading-tight">Rs{reportData.takeawayRevenue}</p>
            </div>
            <p className="text-[9px] font-black text-blue-600 uppercase mt-2">{reportData.takeawayCount} Orders</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="bg-emerald-50 p-4 rounded-2xl border-2 border-emerald-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1 text-emerald-600">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M21 18v1c0 1.1-.9 2-2 2H5c-1.11 0-2-.9-2-2V5c0-1.1.89-2 2-2h14c1.1 0 2 .9 2 2v1h-9c-1.11 0-2 .9-2 2v8c0 1.1.89 2 2 2h9zm-9-2h10V8H12v8zm4-2.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
                <p className="text-[8px] font-black uppercase tracking-widest leading-none">Cash Sales</p>
              </div>
              <p className="text-lg font-black text-emerald-900 leading-tight">Rs{reportData.cashRevenue}</p>
            </div>
            <p className="text-[9px] font-black text-emerald-600 uppercase mt-2">{reportData.cashCount} Orders</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-2xl border-2 border-indigo-100 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-1.5 mb-1 text-indigo-600">
                <svg className="w-2.5 h-2.5" fill="currentColor" viewBox="0 0 24 24"><path d="M15 21H9V19H15V21M19 12V17H5V12H19M19 10H5V7H19V10M19 5H5V3H19V5M19 23H5V19H19V23Z"/></svg>
                <p className="text-[8px] font-black uppercase tracking-widest leading-none">QR / Online</p>
              </div>
              <p className="text-lg font-black text-indigo-900 leading-tight">Rs{reportData.qrRevenue}</p>
            </div>
            <p className="text-[9px] font-black text-indigo-600 uppercase mt-2">{reportData.qrCount} Orders</p>
          </div>
        </div>
      </div>

      {/* Dynamic Revenue Charts Section */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 no-print">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
           <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Revenue Flow Patterns</p>
           <div className="flex bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
             {(['hourly', 'daily', 'monthly'] as ChartPeriod[]).map(p => (
               <button 
                 key={p} onClick={() => setActiveChartPeriod(p)}
                 className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-[9px] font-black uppercase transition-all ${activeChartPeriod === p ? 'bg-white text-orange-600 shadow-sm' : 'text-slate-400'}`}
               >
                 {p}
               </button>
             ))}
           </div>
        </div>
        
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={currentChartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
              <YAxis hide />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '10px', fontWeight: 900 }}
                labelFormatter={(label) => `${chartLabelPrefix}: ${label}`}
                formatter={(value) => [`Rs${value}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="revenue" stroke="#f97316" fill="url(#colorRev)" strokeWidth={3} />
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Daily Item Sold Details */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
          <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Day Items Sold Details</h3>
          <span className="text-[8px] font-black text-slate-400 uppercase bg-white px-2 py-1 rounded-lg border">{new Date(selectedDate).toDateString()}</span>
        </div>
        {reportData.itemBreakdown.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {reportData.itemBreakdown.map((item, index) => (
              <div key={index} className="flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center text-[10px] font-black">
                    {index + 1}
                  </div>
                  <span className="text-[12px] font-black text-slate-800 uppercase tracking-tight">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="block text-[14px] font-black text-slate-900">{item.quantity}</span>
                  <span className="block text-[7px] font-black text-slate-400 uppercase tracking-widest">Units Sold</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-12 text-center text-slate-400 space-y-2">
            <svg className="w-10 h-10 mx-auto opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>
            <p className="text-[9px] font-black uppercase tracking-widest">No sales data for this date</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsView;
