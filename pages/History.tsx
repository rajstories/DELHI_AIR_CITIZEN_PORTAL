import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceArea, CartesianGrid, LineChart, Line } from 'recharts';
import { HistoryPoint, Prediction, ComparisonData, TimeRange, AQICategory } from '../types';
import { fetchHistoryData, fetchPredictions, fetchComparison } from '../services/historyService';
import { AQI_COLORS } from '../constants';
import { Card } from '../components/Card';
import { Download, ChevronDown, Info, X, TrendingUp, TrendingDown, Minus, MapPin, Calendar, Activity, Wind, Clock } from 'lucide-react';

export const History: React.FC = () => {
  const [range, setRange] = useState<TimeRange>('7D');
  const [historyData, setHistoryData] = useState<HistoryPoint[]>([]);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEduModal, setShowEduModal] = useState<string | null>(null);

  useEffect(() => {
    const loadAllData = async () => {
      setLoading(true);
      try {
        const [hist, pred] = await Promise.all([
          fetchHistoryData(range),
          fetchPredictions()
        ]);
        setHistoryData(hist);
        setPredictions(pred);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, [range]);

  const calculateStats = () => {
    if (historyData.length === 0) return null;
    const values = historyData.map(d => d.aqi);
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / values.length);
    const max = Math.max(...values);
    const min = Math.min(...values);
    
    // Simple trend logic comparing first half to second half
    const mid = Math.floor(values.length / 2);
    const firstHalfAvg = values.slice(0, mid).reduce((a,b)=>a+b,0) / mid;
    const secondHalfAvg = values.slice(mid).reduce((a,b)=>a+b,0) / (values.length - mid);
    const trend = secondHalfAvg > firstHalfAvg ? 'worsening' : 'improving';

    return { avg, max, min, trend };
  };

  const stats = calculateStats();

  const handleDownload = () => {
    // Generate an official-looking Government Report
    const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const statsHtml = stats ? `
      <div style="display: flex; gap: 20px; margin-bottom: 20px;">
          <div style="background: #f0f9ff; padding: 15px; border-radius: 8px; flex: 1; border: 1px solid #bae6fd;">
              <div style="font-size: 12px; text-transform: uppercase; color: #64748b;">Average AQI</div>
              <div style="font-size: 24px; font-weight: bold; color: #0f172a;">${stats.avg}</div>
          </div>
          <div style="background: #fef2f2; padding: 15px; border-radius: 8px; flex: 1; border: 1px solid #fecaca;">
              <div style="font-size: 12px; text-transform: uppercase; color: #64748b;">Peak AQI</div>
              <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${stats.max}</div>
          </div>
      </div>
    ` : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Citizen Air Quality Report</title>
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; color: #333; }
          .header { text-align: center; border-bottom: 2px solid #1e3a5f; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 24px; font-weight: bold; color: #1e3a5f; }
          .sub-logo { font-size: 14px; color: #64748b; margin-top: 5px; }
          .report-title { font-size: 28px; font-weight: bold; margin: 20px 0 10px 0; color: #1e3a5f; }
          .date { font-size: 14px; color: #64748b; margin-bottom: 30px; }
          .section { margin-bottom: 30px; }
          .section-title { font-size: 16px; font-weight: bold; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 15px; color: #1e3a5f; }
          .advisory { background: #fdfce7; border-left: 5px solid #eab308; padding: 15px; font-size: 14px; line-height: 1.6; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="header">
           <div class="logo">🏛️ Delhi Pollution Control Committee</div>
           <div class="sub-logo">Citizen Information Portal</div>
        </div>
        
        <div class="report-title">Air Quality Status Report</div>
        <div class="date">Generated on: ${dateStr}</div>

        <div class="section">
           <div class="section-title">Summary (${range} Analysis)</div>
           ${statsHtml}
           <p style="font-size: 14px; line-height: 1.6;">
             This report summarizes the air quality trends for your registered ward. 
             The current trend indicates air quality is <strong>${stats?.trend || 'stable'}</strong> compared to the previous period.
           </p>
        </div>

        <div class="section">
           <div class="section-title">Health Advisory</div>
           <div class="advisory">
              <strong>Official Recommendation:</strong><br/>
              Based on recent trends, sensitive groups (children, elderly, asthmatics) should avoid prolonged outdoor exposure. 
              Wearing N95 masks is highly recommended during morning and evening hours.
              Ensure indoor ventilation is done only between 2 PM - 4 PM when PM2.5 levels typically dip.
           </div>
        </div>

        <div class="footer">
           This is a system-generated report from the Delhi Air Quality Citizen App.<br/>
           Data Source: CPCB & IMD Sensor Network.
        </div>
        
        <script>
           window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
    } else {
      alert("Please allow popups to download the report.");
    }
  };

  if (loading && historyData.length === 0) {
    return <div className="flex items-center justify-center h-[60vh]"><div className="animate-spin text-gov-navy"><Activity size={32}/></div></div>;
  }

  // Ventilation Chart Data (Mocking a dip in afternoon)
  const ventilationData = [
    { time: '10 AM', aqi: 350 },
    { time: '12 PM', aqi: 310 },
    { time: '2 PM', aqi: 180 }, // Low point
    { time: '3 PM', aqi: 185 },
    { time: '4 PM', aqi: 190 },
    { time: '6 PM', aqi: 380 },
    { time: '8 PM', aqi: 420 },
  ];

  return (
    <div className="min-h-full pb-24 bg-gray-50 animate-in fade-in duration-500">
      
      {/* HEADER WITH TIME SELECTOR */}
      <div className="bg-white sticky top-0 z-30 shadow-sm border-b border-gray-100">
          <div className="p-4 flex justify-between items-center">
              <h1 className="text-xl font-bold text-gov-navy">Air Quality History</h1>
              <button 
                onClick={handleDownload} 
                className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded-full transition-colors flex items-center gap-1"
                title="Download Government Report"
              >
                  <Download size={20} />
              </button>
          </div>
          <div className="flex px-4 space-x-6 overflow-x-auto no-scrollbar pb-0">
               {(['24H', '7D', '30D'] as TimeRange[]).map((r) => (
                   <button
                     key={r}
                     onClick={() => setRange(r)}
                     className={`pb-3 px-1 text-sm font-bold border-b-2 transition-colors ${
                         range === r ? 'border-gov-navy text-gov-navy' : 'border-transparent text-gray-400'
                     }`}
                   >
                       {r}
                   </button>
               ))}
               {/* Custom Tab Removed as requested */}
          </div>
      </div>

      <div className="p-4 space-y-6">
        
        {/* SECTION 1: MAIN CHART */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 h-[320px]">
            <h2 className="text-xs uppercase font-bold text-gray-500 mb-4 tracking-wider">AQI Trend - Last {range}</h2>
            <div className="h-[250px] w-full -ml-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={historyData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorAqi" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#1e3a5f" stopOpacity={0.8}/>
                                <stop offset="95%" stopColor="#1e3a5f" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        {/* Background Zones */}
                        <ReferenceArea y1={0} y2={50} fill={AQI_COLORS.Good.bg} fillOpacity={0.15} />
                        <ReferenceArea y1={51} y2={100} fill={AQI_COLORS.Satisfactory.bg} fillOpacity={0.15} />
                        <ReferenceArea y1={101} y2={200} fill={AQI_COLORS.Moderate.bg} fillOpacity={0.15} />
                        <ReferenceArea y1={201} y2={300} fill={AQI_COLORS.Poor.bg} fillOpacity={0.15} />
                        <ReferenceArea y1={301} y2={400} fill={AQI_COLORS['Very Poor'].bg} fillOpacity={0.15} />
                        <ReferenceArea y1={401} y2={500} fill={AQI_COLORS.Severe.bg} fillOpacity={0.15} />

                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 10, fill: '#9ca3af'}} 
                            interval={range === '24H' ? 3 : range === '7D' ? 0 : 4}
                        />
                        <YAxis 
                            hide={false} 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{fontSize: 10, fill: '#9ca3af'}} 
                            domain={[0, 500]}
                            width={35}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Area 
                            type="monotone" 
                            dataKey="aqi" 
                            stroke="#1e3a5f" 
                            strokeWidth={3}
                            fill="url(#colorAqi)" 
                            animationDuration={1000}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>

        {/* SECTION 2: INSIGHTS CARD */}
        {stats && (
            <Card className="!border-l-4 !border-l-blue-500">
                <div className="flex items-center gap-2 mb-4">
                    <Activity className="text-blue-500" />
                    <h3 className="font-bold text-gray-900">{range === '24H' ? 'Daily' : 'Weekly'} Insights</h3>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-3">
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 uppercase font-semibold">Average AQI</span>
                        <div className="text-xl font-bold text-gray-900">{stats.avg}</div>
                    </div>
                    <div className="bg-gray-50 p-3 rounded-lg">
                        <span className="text-xs text-gray-500 uppercase font-semibold">Trend</span>
                        <div className={`flex items-center text-sm font-bold ${stats.trend === 'worsening' ? 'text-red-600' : 'text-green-600'}`}>
                            {stats.trend === 'worsening' ? <TrendingUp size={16} className="mr-1"/> : <TrendingDown size={16} className="mr-1"/>}
                            {stats.trend === 'worsening' ? 'Worsening' : 'Improving'}
                        </div>
                    </div>
                </div>
                <div className="text-sm text-gray-600 flex justify-between">
                    <span>Peak: <strong>{stats.max}</strong></span>
                    <span>Lowest: <strong>{stats.min}</strong></span>
                </div>
            </Card>
        )}

        {/* SECTION 3: VENTILATION FORECAST */}
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl shadow-sm border border-blue-100 p-5">
             <div className="flex items-center gap-2 mb-3">
                 <div className="bg-blue-100 p-2 rounded-full text-blue-600">
                    <Wind size={20} />
                 </div>
                 <h3 className="font-bold text-gov-navy text-lg">Best Time to Ventilate</h3>
             </div>
             
             <p className="text-sm text-gray-700 mb-4">
                 Open your windows between <span className="font-bold text-green-600 bg-green-50 px-1 rounded">2 PM - 4 PM</span> today for fresh air.
             </p>

             {/* Simple Line Chart for Ventilation */}
             <div className="h-[120px] w-full">
                 <ResponsiveContainer width="100%" height="100%">
                     <LineChart data={ventilationData}>
                         <XAxis dataKey="time" tick={{fontSize: 10}} axisLine={false} tickLine={false} />
                         <Tooltip 
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                            itemStyle={{color: '#1e3a5f', fontWeight: 'bold'}}
                         />
                         {/* Highlight the green zone */}
                         <ReferenceArea x1="2 PM" x2="4 PM" fill="#22c55e" fillOpacity={0.15} />
                         <Line type="monotone" dataKey="aqi" stroke="#3b82f6" strokeWidth={3} dot={{r: 4}} />
                     </LineChart>
                 </ResponsiveContainer>
             </div>
             <div className="flex items-center justify-center gap-2 mt-2 text-xs text-gray-500">
                 <Clock size={12} />
                 <span>Forecast based on wind speed & traffic patterns</span>
             </div>
        </div>

        {/* SECTION 4: FORECAST */}
        <div>
            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 ml-1">Next 48 Hours</h3>
            <div className="space-y-3">
                {predictions.map((pred, i) => (
                    <Card key={i} className={`!p-4 ${pred.alertLevel === 'high' ? 'border-l-4 border-l-red-600' : pred.alertLevel === 'moderate' ? 'border-l-4 border-l-orange-500' : 'border-l-4 border-l-yellow-400'}`}>
                        <div className="flex justify-between items-start mb-2">
                            <div>
                                <h4 className="font-bold text-gray-900">{pred.period}</h4>
                                <span className="text-xs text-gray-500">{pred.time}</span>
                            </div>
                            <span className={`text-xs font-bold px-2 py-1 rounded ${
                                pred.alertLevel === 'high' ? 'bg-red-100 text-red-700' : 
                                pred.alertLevel === 'moderate' ? 'bg-orange-100 text-orange-700' : 
                                'bg-yellow-100 text-yellow-700'
                            }`}>
                                {pred.status}
                            </span>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                            <span className="text-sm text-gray-600">Expected AQI:</span>
                            <span className="text-lg font-bold text-gov-navy">{pred.aqiRange}</span>
                        </div>
                    </Card>
                ))}
            </div>
        </div>

        {/* EDUCATIONAL */}
        <div className="grid grid-cols-2 gap-3 pt-4">
            <EduButton label="What is AQI?" onClick={() => setShowEduModal('aqi')} />
            <EduButton label="Health Effects" onClick={() => setShowEduModal('health')} />
        </div>

      </div>

      {/* MODAL - Fixed Visibility and Contrast */}
      {showEduModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
              <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl relative animate-in zoom-in-95 border border-gray-100">
                  <button onClick={() => setShowEduModal(null)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 hover:bg-gray-100 p-1 rounded-full">
                      <X size={24} />
                  </button>
                  
                  {showEduModal === 'aqi' ? (
                      <>
                        <h3 className="text-xl font-bold text-gov-navy mb-4 border-b pb-2">What is AQI?</h3>
                        <p className="text-gray-800 mb-4 font-medium leading-relaxed">Air Quality Index (AQI) is a number from 0-500 that tells you how clean or polluted the air is.</p>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-[#00e400] shadow-sm"></div> <span className="text-gray-700 font-semibold">0-50: Good</span></div>
                            <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-[#ffff00] border border-gray-200 shadow-sm"></div> <span className="text-gray-700 font-semibold">51-100: Satisfactory</span></div>
                            <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-[#ff7e00] shadow-sm"></div> <span className="text-gray-700 font-semibold">101-200: Moderate</span></div>
                            <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-[#ff0000] shadow-sm"></div> <span className="text-gray-700 font-semibold">201-300: Poor</span></div>
                            <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-[#8f3f97] shadow-sm"></div> <span className="text-gray-700 font-semibold">301-400: Very Poor</span></div>
                            <div className="flex items-center gap-3"><div className="w-4 h-4 rounded-full bg-[#7e0023] shadow-sm"></div> <span className="text-gray-700 font-semibold">401-500: Severe</span></div>
                        </div>
                      </>
                  ) : (
                       <>
                        <h3 className="text-xl font-bold text-gov-navy mb-4 border-b pb-2">Health Effects</h3>
                        <p className="text-gray-800 mb-4 font-medium">High PM2.5 levels can penetrate deep into lungs and enter the bloodstream.</p>
                        <ul className="list-disc list-inside text-sm text-gray-700 space-y-2">
                            <li>Coughing & wheezing</li>
                            <li>Asthma aggravation</li>
                            <li>Reduced lung function</li>
                            <li>Heart complications</li>
                        </ul>
                      </>
                  )}
                  
                  <button 
                    onClick={() => setShowEduModal(null)}
                    className="w-full mt-6 bg-gov-navy text-white py-3 rounded-xl font-bold hover:bg-opacity-90 transition-opacity"
                  >
                    Close
                  </button>
              </div>
          </div>
      )}

    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-white p-3 border border-gray-100 shadow-lg rounded-lg text-xs">
                <p className="font-bold text-gray-900 mb-1">{label}</p>
                <p className="text-gov-navy font-semibold">AQI: {payload[0].value}</p>
                <p className="text-gray-500 capitalize">{payload[0].payload.category}</p>
            </div>
        );
    }
    return null;
};

const EduButton = ({ label, onClick }: { label: string; onClick: () => void }) => (
    <button onClick={onClick} className="bg-white border border-gray-200 py-3 rounded-lg text-sm font-semibold text-gray-700 shadow-sm hover:bg-gray-50 flex items-center justify-center gap-2">
        <Info size={16} className="text-blue-500" />
        {label}
    </button>
);
