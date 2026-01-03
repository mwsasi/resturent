
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
  onSyncReport: (dateStr: string) => Promise<boolean>;
}

interface ItemSaleDetail {
  name: string;
  quantity: number;
}

type ChartPeriod = 'hourly' | 'daily' | 'monthly';

const ReportsView: React.FC<ReportsViewProps> = ({ orders, onSyncReport }) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const offset = now.getTimezoneOffset() * 60000;
    return (new Date(now.getTime() - offset)).toISOString().split('T')[0];
  });
  const [activeChartPeriod, setActiveChartPeriod] = useState<ChartPeriod>('daily');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const reportData = useMemo(() => {
    const targetDayOrders = orders.filter(o => 
      o.status === 'delivered' && o.date.startsWith(selectedDate)
    );

    const [selYear, selMonth] = selectedDate.split('-').map(Number);

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
      // Get hour from local date string
      const hour = parseInt(order.date.split('T')[1].split(':')[0]);
      if (!isNaN(hour) && hour < 24) hourlyData[hour].revenue += order.grandTotal;
      
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

    // Monthly data view
    const daysInMonth = new Date(selYear, selMonth, 0).getDate();
    const dailyData = Array.from({ length: daysInMonth }, (_, i) => ({ label: `${i + 1}`, revenue: 0 }));
    
    orders.filter(o => {
      const parts = o.date.split('T')[0].split('-');
      return Number(parts[0]) === selYear && Number(parts[1]) === selMonth && o.status === 'delivered';
    }).forEach(order => {
      const dayIndex = Number(order.date.split('T')[0].split('-')[2]) - 1;
      if (dailyData[dayIndex]) dailyData[dayIndex].revenue += order.grandTotal;
    });

    // Yearly data view
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlyData = monthNames.map(name => ({ label: name, revenue: 0 }));
    
    orders.filter(o => {
      const parts = o.date.split('T')[0].split('-');
      return Number(parts[0]) === selYear && o.status === 'delivered';
    }).forEach(order => {
      const monthIndex = Number(order.date.split('T')[0].split('-')[1]) - 1;
      if (monthlyData[monthIndex]) monthlyData[monthIndex].revenue += order.grandTotal;
    });

    return {
      totalRevenue, totalItemsSold: totalItems, orderCount: targetDayOrders.length,
      dineInCount, dineInRevenue, takeawayCount, takeawayRevenue,
      cashCount, cashRevenue, qrCount, qrRevenue,
      itemBreakdown, hourlyData, dailyData, monthlyData
    };
  }, [orders, selectedDate]);

  const handleSync = async () => {
    setIsSyncing(true);
    setSyncStatus('idle');
    const success = await onSyncReport(selectedDate);
    setSyncStatus(success ? 'success' : 'error');
    setIsSyncing(false);
    setTimeout(() => setSyncStatus('idle'), 3000);
  };

  const currentChartData = activeChartPeriod === 'hourly' 
    ? reportData.hourlyData 
    : activeChartPeriod === 'daily' 
      ? reportData.dailyData 
      : reportData.monthlyData;

  const chartLabelPrefix = activeChartPeriod === 'hourly' ? 'Hour' : activeChartPeriod === 'daily' ? 'Day' : 'Month';

  return (
    <div className="p-4 max-w-6xl mx-auto h-full overflow-y-auto space-y-4 custom-scrollbar pb-32">
      <div className="flex flex-col gap-2 no-print">
        <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Supreme Analytics</h2>
        <div className="flex flex-wrap gap-2">
          <input 
            type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)}
            className="flex-1 bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none"
          />
          <button 
            onClick={handleSync}
            disabled={isSyncing}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase transition-all flex items-center gap-2 ${syncStatus === 'success' ? 'bg-green-600 text-white' : syncStatus === 'error' ? 'bg-red-600 text-white' : 'bg-orange-600 text-white active:scale-95 disabled:opacity-50'}`}
          >
            {isSyncing ? 'Syncing...' : syncStatus === 'success' ? 'Synced!' : 'Sync Day Report'}
          </button>
          <button onClick={() => window.print()} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-black">PRINT</button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 no-print">
        <div className="bg-orange-600 p-5 rounded-2xl text-white shadow-lg">
          <p className="text-[8px] font-black uppercase opacity-60 mb-1 tracking-widest">Day Revenue</p>
          <p className="text-2xl font-black tracking-tight">Rs{reportData.totalRevenue}</p>
          <p className="text-[7px] font-bold uppercase mt-2 opacity-50">Filtered for: {selectedDate}</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200">
          <p className="text-[8px] font-black text-slate-400 uppercase mb-1 tracking-widest">Daily Orders</p>
          <p className="text-2xl font-black text-slate-800 tracking-tight">{reportData.orderCount}</p>
        </div>
        <div className="bg-slate-900 p-5 rounded-2xl text-white shadow-lg">
          <p className="text-[8px] font-black uppercase opacity-60 mb-1 tracking-widest">Total Units</p>
          <p className="text-2xl font-black tracking-tight">{reportData.totalItemsSold}</p>
        </div>
      </div>

      <div className="bg-white p-4 rounded-2xl border border-slate-200 no-print">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-6">
           <div className="flex flex-col">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Revenue Breakdown</p>
              <p className="text-[11px] font-black text-slate-900 uppercase">View by: {activeChartPeriod}</p>
           </div>
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

      {/* NEW: Explicit Daily Breakdown Table to prevent missing data visibility */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden no-print">
        <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
           <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Period Sales Log</h3>
           <span className="text-[8px] font-black text-slate-400 uppercase">Values in Rs</span>
        </div>
        <div className="max-h-60 overflow-y-auto custom-scrollbar">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 bg-white border-b shadow-sm z-10">
               <tr>
                  <th className="px-4 py-3 text-[8px] font-black text-slate-400 uppercase tracking-widest">{chartLabelPrefix}</th>
                  <th className="px-4 py-3 text-[8px] font-black text-slate-400 uppercase tracking-widest text-right">Revenue</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
               {currentChartData.map((d, i) => d.revenue > 0 && (
                 <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 text-[11px] font-black text-slate-700">{d.label}</td>
                    <td className="px-4 py-3 text-[11px] font-black text-slate-900 text-right">Rs{d.revenue}</td>
                 </tr>
               ))}
               {currentChartData.every(d => d.revenue === 0) && (
                 <tr>
                    <td colSpan={2} className="px-4 py-8 text-center text-[9px] font-black text-slate-300 uppercase italic">No sales recorded for this range</td>
                 </tr>
               )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <div className="p-4 border-b bg-slate-50 flex items-center justify-between">
          <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Dish Performance</h3>
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
            <p className="text-[9px] font-black uppercase tracking-widest">No detailed items for {selectedDate}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsView;
