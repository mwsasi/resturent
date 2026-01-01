
import React, { useMemo, useState } from 'react';
import { Order } from '../types';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';

interface ReportsViewProps {
  orders: Order[];
}

const ReportsView: React.FC<ReportsViewProps> = ({ orders }) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const dailyReport = useMemo(() => {
    const targetOrders = orders.filter(o => {
      const oDate = new Date(o.date);
      const oKey = `${oDate.getFullYear()}-${String(oDate.getMonth() + 1).padStart(2, '0')}-${String(oDate.getDate()).padStart(2, '0')}`;
      return oKey === selectedDate && o.status === 'delivered';
    });
    
    const itemStats: Record<string, { qty: number, revenue: number, category: string }> = {};
    const detailedSales: any[] = [];
    let totalRevenue = 0;
    let totalItems = 0;
    let cashRevenue = 0;
    let qrRevenue = 0;

    targetOrders.forEach(order => {
      totalRevenue += order.grandTotal;
      
      if (order.paymentMethod === 'cash') {
        cashRevenue += order.grandTotal;
      } else {
        // Assume QR or others if not explicitly cash
        qrRevenue += order.grandTotal;
      }

      const timeStr = new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      order.items.forEach(item => {
        totalItems += item.quantity;
        if (!itemStats[item.name]) itemStats[item.name] = { qty: 0, revenue: 0, category: item.category };
        itemStats[item.name].qty += item.quantity;
        itemStats[item.name].revenue += (item.price * item.quantity);
        detailedSales.push({ time: timeStr, name: item.name, qty: item.quantity, price: item.price, orderId: order.id });
      });
    });

    // Prepare data for the chart (grouped by hour)
    const chartData = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i}:00`,
      revenue: 0
    }));

    targetOrders.forEach(order => {
      const hour = new Date(order.date).getHours();
      chartData[hour].revenue += order.grandTotal;
    });

    return {
      itemStats: Object.entries(itemStats).map(([name, s]) => ({ name, ...s })).sort((a, b) => b.qty - a.qty),
      detailedSales: [...detailedSales].reverse(),
      totalRevenue,
      cashRevenue,
      qrRevenue,
      totalItemsSold: totalItems,
      orderCount: targetOrders.length,
      chartData
    };
  }, [orders, selectedDate]);

  const cashPercent = dailyReport.totalRevenue > 0 ? (dailyReport.cashRevenue / dailyReport.totalRevenue) * 100 : 0;
  const qrPercent = dailyReport.totalRevenue > 0 ? (dailyReport.qrRevenue / dailyReport.totalRevenue) * 100 : 0;

  return (
    <div className="p-6 max-w-6xl mx-auto h-full overflow-y-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Analytics Dashboard</h2>
          <p className="text-slate-500 text-sm">Real-time performance metrics and sales data for {selectedDate}.</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-orange-500 shadow-sm"
          />
          <button onClick={() => window.print()} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-colors">Print Report</button>
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <div className="bg-orange-600 p-6 rounded-3xl text-white shadow-xl shadow-orange-100 transition-transform hover:scale-[1.02]">
          <p className="text-[10px] font-black text-orange-200 uppercase tracking-widest mb-1">Daily Revenue</p>
          <p className="text-3xl font-black">₹{dailyReport.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-indigo-600 p-6 rounded-3xl text-white shadow-xl shadow-indigo-100 transition-transform hover:scale-[1.02] flex flex-col justify-between">
          <div>
            <p className="text-[10px] font-black text-indigo-200 uppercase tracking-widest mb-1">Payment Breakdown</p>
            <div className="flex items-center justify-between text-xs mt-1">
              <span>Cash:</span>
              <span className="font-black">₹{dailyReport.cashRevenue.toLocaleString()} ({cashPercent.toFixed(0)}%)</span>
            </div>
            <div className="flex items-center justify-between text-xs mt-1">
              <span>QR/Online:</span>
              <span className="font-black">₹{dailyReport.qrRevenue.toLocaleString()} ({qrPercent.toFixed(0)}%)</span>
            </div>
          </div>
          <div className="w-full bg-indigo-900/40 h-1.5 rounded-full mt-4 overflow-hidden flex">
            <div className="h-full bg-white/40" style={{ width: `${cashPercent}%` }}></div>
            <div className="h-full bg-white" style={{ width: `${qrPercent}%` }}></div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Orders</p>
          <p className="text-3xl font-black text-slate-800">{dailyReport.orderCount}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Items Sold</p>
          <p className="text-3xl font-black text-slate-800">{dailyReport.totalItemsSold}</p>
        </div>
      </div>

      {/* SALES CHART */}
      <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm no-print">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest mb-6">Revenue Hourly Trend</h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dailyReport.chartData}>
              <defs>
                <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#f97316" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="hour" 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} 
                interval={2}
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}}
              />
              <Tooltip 
                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ fontWeight: 800, color: '#1e293b' }}
              />
              <Area 
                type="monotone" 
                dataKey="revenue" 
                stroke="#f97316" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorRev)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* LOGS & SUMMARIES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden flex flex-col shadow-sm">
          <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-widest">Detailed Item Sales</h3>
            <span className="text-[10px] text-slate-400 font-bold">{selectedDate}</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50 border-b">
                <tr className="text-[10px] font-black text-slate-400 uppercase">
                  <th className="px-6 py-4">Time</th>
                  <th className="px-6 py-4">Item</th>
                  <th className="px-6 py-4 text-center">Qty</th>
                  <th className="px-6 py-4 text-right">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {dailyReport.detailedSales.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No sales recorded for this date.</td></tr>
                ) : (
                  dailyReport.detailedSales.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-6 py-4 text-slate-400 font-bold text-xs">{s.time}</td>
                      <td className="px-6 py-4 font-bold text-slate-700">{s.name}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-slate-100 text-slate-600 font-black px-2 py-1 rounded text-xs">{s.qty}</span>
                      </td>
                      <td className="px-6 py-4 text-right font-black">₹{s.price * s.qty}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-100 overflow-hidden flex flex-col shadow-sm">
          <div className="px-6 py-4 bg-slate-50 border-b">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Performance by Item</h3>
          </div>
          <div className="flex-1">
            <table className="w-full text-left text-sm">
              <thead className="border-b">
                <tr className="text-[10px] font-black text-slate-400 uppercase">
                  <th className="px-6 py-4">Item Name</th>
                  <th className="px-6 py-4 text-center">Total Units</th>
                  <th className="px-6 py-4 text-right">Revenue</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {dailyReport.itemStats.length === 0 ? (
                  <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">No item data available.</td></tr>
                ) : (
                  dailyReport.itemStats.map((item) => (
                    <tr key={item.name} className="hover:bg-orange-50/30">
                      <td className="px-6 py-4 font-black text-slate-700">{item.name}</td>
                      <td className="px-6 py-4 text-center">
                        <span className="bg-orange-50 text-orange-700 font-black px-3 py-1.5 rounded-xl text-xs">{item.qty} units</span>
                      </td>
                      <td className="px-6 py-4 text-right font-black">₹{item.revenue.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {dailyReport.itemStats.length > 0 && (
            <div className="p-6 bg-slate-900 text-white font-black flex justify-between items-center">
              <span className="uppercase text-xs tracking-widest">Grand Total</span>
              <span className="text-xl text-orange-400">₹{dailyReport.totalRevenue.toLocaleString()}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReportsView;
