
import React, { useMemo, useState } from 'react';
import { Order } from '../types';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell } from 'recharts';
import { analyzeTrafficPatterns } from '../services/gemini';

interface ReportsViewProps {
  orders: Order[];
}

const COLORS = ['#ea580c', '#f97316', '#fb923c', '#fdba74', '#fed7aa', '#ffedd5'];

const ReportsView: React.FC<ReportsViewProps> = ({ orders }) => {
  const [selectedDate, setSelectedDate] = useState<string>(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  });

  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleRunAnalysis = async () => {
    if (orders.length === 0) return;
    setIsAnalyzing(true);
    const result = await analyzeTrafficPatterns(orders);
    setAiAnalysis(result);
    setIsAnalyzing(false);
  };

  const lifetimeStats = useMemo(() => {
    let totalItems = 0;
    let totalRevenue = 0;
    orders.forEach(order => {
      totalRevenue += order.grandTotal;
      order.items.forEach(item => {
        totalItems += item.quantity;
      });
    });
    return { totalRevenue, totalOrders: orders.length, totalItemsSold: totalItems };
  }, [orders]);

  const trendData = useMemo(() => {
    const last15Days = Array.from({ length: 15 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (14 - i));
      const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return { label: d.toLocaleDateString('en-US', { day: '2-digit', month: 'short' }), dateKey, total: 0 };
    });
    orders.forEach(order => {
      const oDate = new Date(order.date);
      const oKey = `${oDate.getFullYear()}-${String(oDate.getMonth() + 1).padStart(2, '0')}-${String(oDate.getDate()).padStart(2, '0')}`;
      const dataPoint = last15Days.find(dp => dp.dateKey === oKey);
      if (dataPoint) dataPoint.total += order.grandTotal;
    });
    return last15Days;
  }, [orders]);

  const dailyReport = useMemo(() => {
    const targetOrders = orders.filter(o => {
      const oDate = new Date(o.date);
      const oKey = `${oDate.getFullYear()}-${String(oDate.getMonth() + 1).padStart(2, '0')}-${String(oDate.getDate()).padStart(2, '0')}`;
      return oKey === selectedDate;
    });
    
    const itemStats: Record<string, { qty: number, revenue: number, category: string }> = {};
    const detailedSales: any[] = [];
    let totalRevenue = 0;
    let totalItems = 0;

    targetOrders.forEach(order => {
      totalRevenue += order.grandTotal;
      const timeStr = new Date(order.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      order.items.forEach(item => {
        totalItems += item.quantity;
        if (!itemStats[item.name]) itemStats[item.name] = { qty: 0, revenue: 0, category: item.category };
        itemStats[item.name].qty += item.quantity;
        itemStats[item.name].revenue += (item.price * item.quantity);
        detailedSales.push({ time: timeStr, name: item.name, qty: item.quantity, price: item.price, orderId: order.id });
      });
    });

    return {
      itemStats: Object.entries(itemStats).map(([name, s]) => ({ name, ...s })).sort((a, b) => b.qty - a.qty),
      detailedSales: [...detailedSales].reverse(),
      totalRevenue,
      totalItemsSold: totalItems,
      orderCount: targetOrders.length
    };
  }, [orders, selectedDate]);

  return (
    <div className="p-6 max-w-6xl mx-auto h-full overflow-y-auto space-y-8 pb-20">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 no-print">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Analytics Dashboard</h2>
          <p className="text-slate-500 text-sm">Real-time performance metrics and AI insights.</p>
        </div>
        <div className="flex items-center gap-3">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white border-2 border-slate-200 rounded-xl px-4 py-2 text-sm font-bold outline-none focus:border-orange-500"
          />
          <button onClick={window.print} className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold">Print Report</button>
        </div>
      </div>

      {/* AI PEAK & FAST MOVING ANALYSIS SECTION */}
      <div className="bg-gradient-to-br from-indigo-900 to-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl relative overflow-hidden no-print">
        <div className="absolute top-0 right-0 p-8 opacity-10">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-32 w-32" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>

        <div className="relative z-10">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black tracking-tight">AI Operations Intelligence</h3>
              <p className="text-indigo-200 text-xs font-medium uppercase tracking-widest mt-1">Traffic & Velocity Analysis</p>
            </div>
            <button 
              onClick={handleRunAnalysis}
              disabled={isAnalyzing || orders.length === 0}
              className={`px-6 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2 ${
                isAnalyzing ? 'bg-slate-700 cursor-not-allowed' : 'bg-orange-500 hover:bg-orange-600 shadow-xl shadow-orange-900/40'
              }`}
            >
              {isAnalyzing ? 'Scanning Orders...' : 'Analyze Peak Patterns'}
            </button>
          </div>

          {!aiAnalysis ? (
            <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
              <p className="text-slate-400 italic">Click the button to identify Peak/Off-Peak times and Fast-Moving Items based on your history.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white/10 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
                <p className="text-[10px] font-black text-indigo-300 uppercase mb-4 tracking-tighter">🔥 Peak Performance</p>
                <p className="text-2xl font-black text-white">{aiAnalysis.peakHour}</p>
                <p className="text-[10px] text-indigo-200 mt-2">Highest customer volume detected</p>
              </div>
              <div className="bg-white/10 p-6 rounded-3xl border border-white/5 backdrop-blur-md">
                <p className="text-[10px] font-black text-emerald-400 uppercase mb-4 tracking-tighter">❄️ Off-Peak Window</p>
                <p className="text-2xl font-black text-white">{aiAnalysis.offPeakHour}</p>
                <p className="text-[10px] text-indigo-200 mt-2">Ideal for prep or promotions</p>
              </div>
              <div className="bg-orange-500/20 p-6 rounded-3xl border border-orange-500/30 backdrop-blur-md">
                <p className="text-[10px] font-black text-orange-400 uppercase mb-4 tracking-tighter">⚡ Fast Moving Item</p>
                <p className="text-2xl font-black text-white">{aiAnalysis.fastestMovingItem}</p>
                <p className="text-[10px] text-orange-200 mt-2">High velocity star product</p>
              </div>
              <div className="md:col-span-3 bg-indigo-500/10 p-6 rounded-3xl border border-indigo-500/20">
                <p className="text-[10px] font-black text-indigo-300 uppercase mb-2">Manager Strategy Note</p>
                <p className="text-sm font-medium leading-relaxed italic">"{aiAnalysis.managerTip}"</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 no-print">
        <div className="bg-orange-600 p-6 rounded-3xl text-white shadow-xl shadow-orange-100">
          <p className="text-[10px] font-black text-orange-200 uppercase tracking-widest mb-1">Today's Revenue</p>
          <p className="text-3xl font-black">₹{dailyReport.totalRevenue.toLocaleString()}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Today's Orders</p>
          <p className="text-3xl font-black text-slate-800">{dailyReport.orderCount}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Items Sold Today</p>
          <p className="text-3xl font-black text-slate-800">{dailyReport.totalItemsSold}</p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Avg Order Value</p>
          <p className="text-3xl font-black text-slate-800">₹{dailyReport.orderCount > 0 ? (dailyReport.totalRevenue / dailyReport.orderCount).toFixed(0) : '0'}</p>
        </div>
      </div>

      {/* LOGS & SUMMARIES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden flex flex-col shadow-sm">
          <div className="px-6 py-4 bg-slate-900 text-white flex justify-between items-center">
            <h3 className="text-xs font-black uppercase tracking-widest">Detailed Item Sales Journal</h3>
            <span className="text-[10px] text-slate-400 font-bold">{selectedDate}</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto">
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
                  <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">No sales data.</td></tr>
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

        <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden flex flex-col shadow-sm">
          <div className="px-6 py-4 bg-slate-50 border-b">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Fastest Moving Summary</h3>
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
                  <tr><td colSpan={3} className="px-6 py-12 text-center text-slate-400 italic">No data.</td></tr>
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
            <div className="p-6 bg-slate-900 text-white font-black flex justify-between items-center rounded-b-3xl">
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
