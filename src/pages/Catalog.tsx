import React, { useState, useEffect, useCallback, useRef } from 'react';
import { FurnitureSet, SiteSettings } from '../types';
import { Armchair, Building, Tag, Smartphone, CheckCircle, Menu, X, Search, ChevronLeft, ChevronRight, PlayCircle, Loader2, MessageCircle, Download, FileText, Facebook, Instagram, Twitter, Youtube, Linkedin, Link as LinkIcon, ShoppingCart, Mail } from 'lucide-react';
import { cn } from '../lib/utils';
import { db } from '../lib/firebase';
import { collection, onSnapshot, orderBy, query, addDoc, doc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from '../lib/firebaseErrors';
import { motion, AnimatePresence } from 'motion/react';

// Fallback visual properties
const LOGO_URL = 'https://drive.google.com/thumbnail?id=17YMJ6Rm6_gCVx29r6Ui-uXZUF5-6Z_z4&sz=w400';

const DEFAULT_ABOUT_SET: FurnitureSet = {
  id: 'about',
  name: 'من نحن',
  price: '',
  description: [
    'منذ عام 2005، انطلقت شركة سكر للأثاث لتقدم مفهوماً متكاملاً للأناقة والراحة.',
    'نحن نجمع بين أصالة التصميم المحلي وأعلى معايير جودة التصنيع العالمية، لنضع بين يديك أثاثاً عصرياً يثري مساحاتك، ويثبت جدارته في السوق المحلي وأسواق التصدير العالمية.'
  ],
  images: [],
  videos: [],
  isAbout: true
};

export default function Catalog() {
  const [sets, setSets] = useState<FurnitureSet[]>([DEFAULT_ABOUT_SET]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({ whatsappNumbers: [], socialLinks: [] });
  const [activeSetId, setActiveSetId] = useState<string>('about');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);

  const [isWhatsAppDropdownOpen, setIsWhatsAppDropdownOpen] = useState(false);
  const [cartItems, setCartItems] = useState<{item: FurnitureSet, quantity: number}[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);

  const handleAddToCart = (set: FurnitureSet, add: boolean = true) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.item.id === set.id);
      if (existing) {
        if (!add && existing.quantity === 1) {
          return prev.filter(i => i.item.id !== set.id);
        }
        return prev.map(i => i.item.id === set.id ? { ...i, quantity: i.quantity + (add ? 1 : -1) } : i);
      }
      if (add) {
         return [...prev, { item: set, quantity: 1 }];
      }
      return prev;
    });
  };

  const handleRemoveFromCart = (setId: string) => {
    setCartItems(prev => prev.filter(i => i.item.id !== setId));
  };

  useEffect(() => {
    let unsubscribe: () => void;
    const fetchSets = () => {
      if (!db) return;
      try {
        const q = query(collection(db, 'furniture_sets'), orderBy('createdAt', 'desc'));
        unsubscribe = onSnapshot(q, (querySnapshot) => {
          const fetchedSets = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FurnitureSet));
          // Filter out sets with no price extracted (e.g. "تواصل معنا" or "يرجى التواصل لمعرفة السعر") and hidden sets
          const validSets = fetchedSets.filter(s => !['تواصل معنا', 'يرجى التواصل لمعرفة السعر'].includes(s.price) && !s.isHidden);
          setSets([DEFAULT_ABOUT_SET, ...validSets]);
        }, (error) => {
          console.error("Error fetching sets:", error);
          handleFirestoreError(error, OperationType.GET, 'furniture_sets');
        });
      } catch (error) {
        console.error("Error setting up snapshot:", error);
      }
    };
    fetchSets();

    let unsubscribeSettings: () => void;
    if (db) {
       unsubscribeSettings = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
         if (snap.exists()) setSiteSettings(snap.data() as SiteSettings);
       });
    }

    return () => {
      if (unsubscribe) unsubscribe();
      if (unsubscribeSettings) unsubscribeSettings();
    };
  }, []);

  const activeSet = sets.find(s => s.id === activeSetId) || sets[0];
  const filteredSets = sets.filter(s => s.name.includes(searchQuery) || s.isAbout);

  const mediaList = [
    ...(activeSet?.images || []).map(url => ({ type: 'img', url })),
    ...(activeSet?.videos || []).map(url => ({ type: 'vid', url }))
  ];
  
  const currentMedia = mediaList[activeMediaIndex];

  // Reset media index when changing sets
  useEffect(() => {
    setActiveMediaIndex(0);
  }, [activeSetId]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-dark text-text-main font-sans selection:bg-gold/30 print-container">
      {/* Header */}
      <header className="h-[68px] glass-panel flex shrink-0 items-center justify-between px-4 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.5)] hide-on-print relative border-b border-gold/10">
        <div className="flex items-center gap-3">
          <button className="md:hidden w-9 h-9 flex items-center justify-center rounded-lg bg-dark-3/50 backdrop-blur-md border border-white/5 text-text-main hover:text-white hover:bg-gold/20 hover:border-gold/40 transition-all" onClick={() => setIsSidebarOpen(true)}>
            <Menu size={16} />
          </button>
          <div className="w-[52px] h-[52px] rounded-xl bg-gradient-to-tr from-dark-3 to-dark-1 border-[1px] border-gold/40 flex items-center justify-center relative overflow-hidden shrink-0 shadow-[0_2px_15px_rgba(200,149,42,0.15)]">
            <img src={LOGO_URL} alt="Logo" className="absolute inset-0 w-full h-full object-contain p-1" />
          </div>
          <div>
            <div className="text-[17px] font-serif font-bold text-white leading-[1.2] tracking-wide">SUKAR <span className="font-sans text-gold-l">FURNITURE</span></div>
            <div className="text-[10px] text-text-dim/80 font-bold tracking-[0.2em] uppercase mt-0.5">Premium Collection</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {siteSettings.catalogPdfUrl ? (
            <a href={siteSettings.catalogPdfUrl} target="_blank" rel="noopener noreferrer" download="Sukar-Furniture-Catalog.pdf" className="flex h-9 px-3 items-center gap-2 bg-dark-3 border-[1.5px] border-white/10 rounded-lg text-white text-xs font-bold hover:bg-white/10 transition-all">
              <FileText size={14} className="text-gold" /> تنزيل الكتالوج
            </a>
          ) : (
            <button onClick={() => {
              alert('عذراً، لم يقم الإداري بإنشاء الكتالوج بعد.');
            }} className="flex h-9 px-3 items-center gap-2 bg-dark-3 border-[1.5px] border-white/10 rounded-lg text-white text-xs font-bold hover:bg-white/10 transition-all">
              <FileText size={14} className="text-gold" /> تنزيل الكتالوج
            </button>
          )}
          {siteSettings.socialLinks?.map((link, i) => {
            let IconPattern = <LinkIcon size={14} />;
            const platform = link.platform?.toLowerCase() || '';
            if (platform.includes('facebook') || platform.includes('فيسبوك')) IconPattern = <Facebook size={14} />;
            else if (platform.includes('instagram') || platform.includes('انستغرام') || platform.includes('انستا')) IconPattern = <Instagram size={14} />;
            else if (platform.includes('twitter') || platform.includes('x') || platform.includes('تويتر')) IconPattern = <Twitter size={14} />;
            else if (platform.includes('youtube') || platform.includes('يوتيوب')) IconPattern = <Youtube size={14} />;
            else if (platform.includes('linkedin') || platform.includes('لينكدين')) IconPattern = <Linkedin size={14} />;

            return (
             <a key={i} href={link.url} target="_blank" rel="noreferrer" className="hidden sm:flex w-9 h-9 items-center justify-center bg-dark-3 border-[1.5px] border-white/10 rounded-lg text-white font-bold hover:bg-white/10 hover:text-gold transition-all shadow-[0_0_10px_rgba(0,0,0,0.2)]" title={link.platform}>
               {IconPattern}
             </a>
            );
          })}
          {siteSettings.contactEmail && (
            <a href={`mailto:${siteSettings.contactEmail}`} target="_top" className="hidden sm:flex w-9 h-9 items-center justify-center bg-dark-3 border-[1.5px] border-white/10 rounded-lg text-white font-bold hover:bg-white/10 hover:text-gold transition-all shadow-[0_0_10px_rgba(0,0,0,0.2)]" title="راسلنا عبر البريد الإلكتروني">
               <Mail size={14} />
            </a>
          )}
          {siteSettings.whatsappNumbers?.length > 0 ? (
             <a href={`https://wa.me/${siteSettings.whatsappNumbers[0].number}`} target="_blank" rel="noreferrer" className="hidden sm:flex h-9 px-4 items-center gap-2 bg-gold-dim border-[1.5px] border-gold/40 rounded-lg text-gold-l text-xs font-extrabold hover:bg-gold hover:text-white hover:border-gold shadow-[0_3px_14px_rgba(200,149,42,0.35)] transition-all">
               <Smartphone size={14} /> تواصل
             </a>
          ) : (
             <a href="https://wa.me/201090902911" target="_blank" rel="noreferrer" className="hidden sm:flex h-9 px-4 items-center gap-2 bg-gold-dim border-[1.5px] border-gold/40 rounded-lg text-gold-l text-xs font-extrabold hover:bg-gold hover:text-white hover:border-gold shadow-[0_3px_14px_rgba(200,149,42,0.35)] transition-all">
               <Smartphone size={14} /> تواصل
             </a>
          )}
          <button onClick={() => setIsCartOpen(true)} className="relative flex w-9 h-9 items-center justify-center bg-dark-3 border-[1.5px] border-white/10 rounded-lg text-white hover:bg-white/10 hover:text-gold transition-all">
            <ShoppingCart size={16} />
            {cartItems.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
                {cartItems.reduce((acc, c) => acc + c.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden main-content-wrapper">
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={cn(
          "fixed md:relative top-0 bottom-0 md:h-full w-[300px] glass-panel border-r border-gold/10 flex flex-col shrink-0 z-50 transition-transform duration-300 md:translate-x-0 right-0 max-w-[92vw]",
          isSidebarOpen ? "translate-x-0" : "translate-x-full"
        )}>
          <div className="p-4 border-b border-white/5 flex items-center justify-between backdrop-blur-sm bg-dark/30">
            <span className="text-[10px] font-inter font-bold text-gold-dim/80 tracking-[2px] uppercase">INDEX</span>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-white/50 font-inter">{sets.filter(s => !s.isAbout).length} Items</span>
              <button className="md:hidden w-[30px] h-[30px] flex items-center justify-center bg-dark-3/50 rounded-lg text-text-main hover:text-white transition-all" onClick={() => setIsSidebarOpen(false)}>
                <X size={12} />
              </button>
            </div>
          </div>

          <div className="p-3 border-b border-white/5 relative bg-dark/20">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-text-dim" size={14} />
            <input
              type="text"
              placeholder="بحث عن طقم..."
              className="w-full h-10 bg-dark-3/40 border-b border-white/10 rounded-lg pl-10 pr-4 text-[13px] text-white outline-none focus:border-gold focus:bg-white/5 transition-all shadow-inner backdrop-blur-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <div className="flex-1 overflow-y-auto p-3 custom-scrollbar space-y-1.5">
            {filteredSets.map((set, mapIdx) => (
              <div
                key={set.id}
                onClick={() => { setActiveSetId(set.id); if(window.innerWidth <= 768) setIsSidebarOpen(false); }}
                className={cn(
                  "flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-all duration-300 border backdrop-blur-sm group relative overflow-hidden",
                  activeSetId === set.id ? "bg-gradient-to-r from-gold/10 to-transparent border-gold/30 shadow-[0_4px_20px_rgba(200,149,42,0.1)]" : "border-white/5 hover:border-white/10 hover:bg-white/5"
                )}
              >
                {activeSetId === set.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-gold rounded-r-full" />}
                
                <div className={cn(
                  "w-[48px] h-[48px] rounded-lg flex items-center justify-center shrink-0 overflow-hidden relative shadow-inner",
                  set.isAbout ? "bg-gradient-to-br from-gold/20 to-transparent border border-gold/20" : "bg-dark-3/50 border border-white/5"
                )}>
                  {set.isAbout ? (
                    <Building className="text-gold" size={20} />
                  ) : set.images?.[0] ? (
                    <img src={set.images[0]} alt={set.name} className="w-full h-full object-cover mix-blend-luminosity opacity-80 group-hover:mix-blend-normal group-hover:opacity-100 transition-all duration-500" />
                  ) : (
                    <Armchair className="text-text-dim" size={14} />
                  )}
                </div>
                <div className="flex-1 overflow-hidden relative z-10">
                  <div className="text-[13px] font-sans font-bold text-white/90 truncate group-hover:text-white transition-colors">{set.name}</div>
                  <div className="text-[10px] text-text-dim mt-0.5 font-medium tracking-wide">
                    {set.isAbout ? 'Company Profile' : set.videos?.length ? <span className="text-teal-l flex items-center gap-1"><PlayCircle size={8}/> Media</span> : 'Furniture Set'}
                  </div>
                  {set.price && (
                    <div className="text-gold font-inter font-semibold text-[11px] mt-1 tracking-wider opacity-90 drop-shadow-sm">
                      {set.price.replace(/السعر\s*[:\-]*\s*/g, '').trim()}
                    </div>
                  )}
                </div>
                <div className="flex flex-col items-center justify-center gap-1.5 shrink-0 z-10 relative">
                  {!set.isAbout && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        // Instead of replacing the existing item, optionally we can just increment.
                        // Wait, he wants the multiple item UI in the cart. The cart icon in sidebar should add to cart.
                        handleAddToCart(set);
                      }}
                      className={cn(
                        "w-6 h-6 rounded-md flex items-center justify-center transition-all",
                        cartItems.some(i => i.item.id === set.id) ? "bg-red-500/20 text-red-400 hover:bg-red-500/30" : "bg-dark-4 border border-white/5 text-white/50 hover:bg-dark-3 hover:text-white"
                      )}
                      title="أضف إلى السلة"
                    >
                      <ShoppingCart size={12} className={cartItems.some(i => i.item.id === set.id) ? "fill-red-400" : ""} />
                    </button>
                  )}
                  {activeSetId === set.id && (
                    <div className="w-5 h-5 rounded-md bg-gold flex items-center justify-center text-white">
                      <ChevronLeft size={10} strokeWidth={3}/>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto flex flex-col relative w-full h-full bg-transparent">
          <AnimatePresence mode="wait">
          {activeSet.isAbout ? (
            <motion.div 
              key="about"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col items-center py-16 px-6 min-h-screen relative overflow-y-auto"
            >
              {/* Elegant central logo */}
              <div className="relative z-10 flex flex-col items-center w-full max-w-2xl mx-auto mb-16">
                <div className="w-[140px] h-[140px] rounded-2xl glass-panel border border-gold/40 flex items-center justify-center mb-8 shadow-[0_20px_50px_rgba(200,149,42,0.15)] relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-tr from-gold/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
                  <img src={LOGO_URL} alt="Logo" className="w-[100px] h-[100px] object-contain relative z-10" />
                </div>
                
                <h1 className="text-[32px] md:text-[40px] font-serif font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-l via-gold to-gold-l mb-4 drop-shadow-sm tracking-wide">
                  SUKAR FURNITURE
                </h1>
                
                <div className="w-16 h-[2px] bg-gradient-to-r from-transparent via-gold to-transparent mb-8" />
                
                <div className="text-center leading-relaxed text-[15px] font-sans text-white/80 max-w-xl">
                  {activeSet.description.map((p, i) => <p key={i} className="mb-3">{p}</p>)}
                </div>
              </div>

              {/* The Index Menu */}
              <div className="w-full max-w-4xl mx-auto relative z-10 flex flex-col gap-8">
                <div className="text-center font-serif text-[24px] text-gold-l tracking-[4px] uppercase mb-2">Collection Index</div>
                
                <div className="glass-panel border-gold/20 rounded-2xl shadow-[0_30px_60px_rgba(0,0,0,0.4)] overflow-hidden relative">
                  {/* Subtle brushed metal effect */}
                  <div className="absolute inset-0 opacity-10 mix-blend-overlay bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxmaWx0ZXIgaWQ9Im4iPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjI1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIi8+PC9zdmc+')]"></div>
                  
                  <div className="flex flex-col relative z-10 divide-y divide-gold/10">
                    {sets.filter(s => !s.isAbout).map((item, idx) => (
                      <div 
                        key={item.id} 
                        onClick={() => setActiveSetId(item.id)}
                        className="flex items-center justify-between p-5 md:px-8 hover:bg-gold/5 transition-colors cursor-pointer group"
                      >
                        <div className="flex items-center gap-6">
                          <span className="text-gold/50 font-serif text-lg w-8 font-black group-hover:text-gold transition-colors">{(idx + 1).toString().padStart(2, '0')}</span>
                          <span className="text-white/90 font-serif text-[18px] md:text-[20px] group-hover:text-gold-l transition-colors">{item.name}</span>
                        </div>
                        {item.price && (
                          <div className="flex items-center gap-3">
                            <span className="text-[12px] font-sans text-white/40 uppercase tracking-widest hidden sm:inline">Price</span>
                            <span className="text-gold-l font-inter font-bold text-[16px] md:text-[18px] tracking-wide relative">
                               {item.price.replace(/السعر\s*[:\-]*\s*/g, '').trim()}
                               <div className="absolute -bottom-1 left-0 right-0 h-[1px] bg-gold/30 scale-x-0 group-hover:scale-x-100 transition-transform origin-right duration-300"></div>
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contact section */}
              <div className="flex flex-wrap gap-4 justify-center w-full max-w-2xl mx-auto mt-20 relative z-10">
                {siteSettings.whatsappNumbers && siteSettings.whatsappNumbers.length > 0 ? (
                  siteSettings.whatsappNumbers.map((num, i) => (
                    <a key={i} href={`https://wa.me/${num.number}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 glass-panel !bg-gold/10 border-gold/30 rounded-xl px-5 py-3 hover:!bg-gold/20 hover:border-gold/50 transition-all shadow-lg hover:-translate-y-1">
                      <Smartphone size={18} className="text-gold-l"/>
                      <span className="text-[14px] font-inter font-bold text-white tracking-wider">{num.label ? num.label : num.number}</span>
                    </a>
                  ))
                ) : (
                  <>
                    <a href="https://wa.me/201090902911" target="_blank" rel="noreferrer" className="flex items-center gap-3 glass-panel !bg-gold/10 border-gold/30 rounded-xl px-5 py-3 hover:!bg-gold/20 hover:border-gold/50 transition-all shadow-lg hover:-translate-y-1">
                      <Smartphone size={18} className="text-gold-l"/>
                      <span className="text-[14px] font-inter font-bold text-white tracking-wider">01090902911</span>
                    </a>
                    <a href="https://wa.me/201090903482" target="_blank" rel="noreferrer" className="flex items-center gap-3 glass-panel !bg-gold/10 border-gold/30 rounded-xl px-5 py-3 hover:!bg-gold/20 hover:border-gold/50 transition-all shadow-lg hover:-translate-y-1">
                      <Smartphone size={18} className="text-gold-l"/>
                      <span className="text-[14px] font-inter font-bold text-white tracking-wider">01090903482</span>
                    </a>
                  </>
                )}
                {siteSettings.socialLinks?.map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 glass-panel border-white/10 rounded-xl px-5 py-3 hover:bg-white/5 transition-all hover:-translate-y-1">
                      <MessageCircle size={18} className="text-teal-l" />
                      <span className="text-[14px] font-bold text-white">{link.platform}</span>
                    </a>
                ))}
                {siteSettings.contactEmail && (
                  <a href={`mailto:${siteSettings.contactEmail}`} target="_top" className="flex items-center gap-3 glass-panel border-white/10 rounded-xl px-5 py-3 hover:bg-white/5 transition-all hover:-translate-y-1">
                    <Mail size={18} className="text-gold" />
                    <span className="text-[14px] font-bold text-white">البريد الإلكتروني</span>
                  </a>
                )}
              </div>
              
              <footer className="mt-24 text-center text-white/30 text-[11px] font-sans tracking-widest uppercase relative z-10 pb-10">
                © {new Date().getFullYear()} Sukar Furniture • Premium Catalog Edition
              </footer>
            </motion.div>
          ) : (
            <motion.div 
              key={activeSet.id}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col h-full"
            >
              {/* Media viewer (Stage) */}
              <div className="relative w-full bg-dark overflow-hidden shrink-0 h-[50%] md:h-[65%] flex flex-col select-none">
                {mediaList.length > 0 ? (
                  <>
                    <div className="relative flex-1">
                      {currentMedia?.type === 'img' ? (
                        <>
                          <img src={currentMedia.url} className="w-full h-full object-contain absolute inset-0 mix-blend-lighten" alt="Set preview" />
                          <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03] mix-blend-overlay overflow-hidden">
                            <span className="font-serif text-[40vw] text-white leading-none select-none">S</span>
                          </div>
                        </>
                      ) : currentMedia?.type === 'vid' ? (
                        <video src={currentMedia.url} controls className="w-full h-full object-contain absolute inset-0" />
                      ) : null}
                      
                      {mediaList.length > 1 && (
                        <>
                          <button 
                            className="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 glass-panel !rounded-full flex items-center justify-center text-white/70 hover:text-white hover:border-gold/50 transition-all z-10"
                            onClick={() => setActiveMediaIndex(p => p > 0 ? p - 1 : mediaList.length - 1)}
                          >
                            <ChevronRight size={24}/>
                          </button>
                          <button 
                            className="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 glass-panel !rounded-full flex items-center justify-center text-white/70 hover:text-white hover:border-gold/50 transition-all z-10"
                            onClick={() => setActiveMediaIndex(p => p < mediaList.length - 1 ? p + 1 : 0)}
                          >
                            <ChevronLeft size={24}/>
                          </button>
                          <div className="absolute top-4 right-4 glass-panel text-white/90 text-[12px] font-bold px-4 py-1.5 rounded-full border-white/10 tracking-widest font-inter">
                            {activeMediaIndex + 1} / {mediaList.length}
                          </div>
                        </>
                      )}
                      {currentMedia?.type === 'vid' && (
                        <div className="absolute top-4 left-4 glass-panel text-gold text-[12px] font-bold px-4 py-1.5 rounded-full flex items-center gap-2 shadow-lg">
                          <PlayCircle size={14}/> فيديو
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white/10 gap-4">
                    <Armchair size={64} />
                    <div className="text-sm font-bold text-white/20">لا توجد صور لهذا الطقم</div>
                  </div>
                )}
              </div>
              
              {/* Thumbs */}
              {mediaList.length > 1 && (
                <div className="flex gap-2.5 p-4 overflow-x-auto glass-panel !bg-dark-1/80 shrink-0 custom-scrollbar z-20">
                  {mediaList.map((m, idx) => (
                    <div 
                      key={idx} 
                      className={cn(
                        "w-[70px] h-[70px] rounded-lg overflow-hidden cursor-pointer transition-all duration-300 shrink-0 relative",
                        activeMediaIndex === idx ? "ring-2 ring-gold shadow-[0_0_15px_rgba(200,149,42,0.4)] scale-105 z-10" : "border border-white/10 hover:border-white/30 opacity-70 hover:opacity-100"
                      )}
                      onClick={() => setActiveMediaIndex(idx)}
                    >
                      {m.type === 'img' ? (
                        <img src={m.url} className="w-full h-full object-cover" alt="" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white bg-dark-3">
                           <PlayCircle size={24}/>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Info panel */}
              <div className="p-5 md:p-8 bg-gradient-to-t from-dark to-dark-2/90 flex-col grow shrink-0 min-h-[50%] backdrop-blur-xl relative z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
                <div className="flex items-end justify-between mb-6 pb-4 border-b border-white/10">
                  <div className="text-[28px] md:text-[34px] font-serif font-black text-white leading-tight tracking-wide drop-shadow-md">
                    {activeSet.name}
                  </div>
                  {activeSet.price && (
                    <div className="text-left shrink-0 pl-4">
                      <div className="text-[10px] font-inter font-bold text-gold-l tracking-[2px] uppercase mb-1 opacity-80">Price</div>
                      <div className="text-[24px] md:text-[28px] font-serif text-gold-xl leading-none flex items-baseline drop-shadow-[0_0_15px_rgba(200,149,42,0.3)]">
                        {activeSet.price.replace(/السعر\s*[:\-]*\s*/g, '').trim()}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                  <div className="flex gap-3 relative flex-wrap md:flex-nowrap col-span-full">
                    <button onClick={() => {
                        if (siteSettings.whatsappNumbers?.length > 1) {
                           setIsWhatsAppDropdownOpen(!isWhatsAppDropdownOpen);
                        } else {
                           const number = siteSettings.whatsappNumbers?.[0]?.number || '201090902911';
                           window.open(`https://wa.me/${number}?text=${encodeURIComponent('أريد الاستفسار أو حجز طقم: ' + activeSet.name)}`, '_blank');
                        }
                      }} 
                      className="flex-[2] min-w-[50%] flex items-center justify-center gap-3 bg-gradient-to-r from-gold/80 to-gold shadow-[0_4px_20px_rgba(200,149,42,0.3)] border border-gold-l/50 rounded-xl p-3.5 hover:shadow-[0_4px_25px_rgba(200,149,42,0.5)] transition-all hover:-translate-y-0.5 group"
                    >
                      <div className="text-center w-full">
                        <div className="text-[14px] font-bold text-dark-1 uppercase tracking-wide flex justify-center items-center gap-2">
                          <MessageCircle size={18} /> احجز الآن
                        </div>
                      </div>
                    </button>
                    {isWhatsAppDropdownOpen && siteSettings.whatsappNumbers?.length > 1 && (
                      <div className="absolute bottom-[110%] mb-2 left-0 w-full md:w-64 glass-panel !bg-dark-1/90 border border-gold/30 rounded-xl max-h-48 overflow-y-auto shadow-2xl z-[60]">
                         {siteSettings.whatsappNumbers.map((num, i) => (
                           <a key={i} href={`https://wa.me/${num.number}?text=${encodeURIComponent('أريد الاستفسار أو حجز طقم: ' + activeSet.name)}`} target="_blank" rel="noreferrer" className="block px-4 py-3.5 text-sm text-white/90 hover:text-gold hover:bg-gold/10 border-b border-white/5 last:border-b-0 font-bold transition-all" onClick={() => setIsWhatsAppDropdownOpen(false)}>
                              {num.label || num.number}
                           </a>
                         ))}
                      </div>
                    )}
                    {(() => {
                      const cartItem = cartItems.find(item => item.item.id === activeSet.id);
                      const isInCart = !!cartItem;
                      return (
                        <div className="flex-1 min-w-[30%] flex items-center justify-between glass-panel border border-white/10 rounded-xl p-1.5 transition-all">
                          {isInCart ? (
                            <div className="flex items-center justify-between w-full px-2">
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleAddToCart(activeSet, true); }}
                                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-gold hover:text-dark-1 transition-colors"
                              >
                                +
                              </button>
                              <span className="font-bold text-white px-3 font-inter">{cartItem.quantity}</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleAddToCart(activeSet, false); }}
                                className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center hover:bg-red-500 hover:text-white transition-colors"
                              >
                                -
                              </button>
                            </div>
                          ) : (
                            <button 
                              onClick={(e) => { e.stopPropagation(); handleAddToCart(activeSet, true); }}
                              className="w-full h-full min-h-[44px] flex items-center justify-center gap-2 hover:bg-white/5 rounded-lg transition-colors text-white"
                              title="أضف إلى السلة"
                            >
                              <div className="text-[13px] font-bold flex flex-col items-center">
                                <ShoppingCart size={18} />
                                <span className="text-[10px] mt-1.5 opacity-80">للسلة</span>
                              </div>
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pb-8">
                  {activeSet.description.map((spec, i) => (
                    <div key={i} className="flex items-center gap-3.5 glass-panel !bg-white/5 border border-white/5 rounded-xl p-3.5 hover:border-gold/30 hover:bg-white/10 transition-all shadow-sm">
                      <div className="w-[8px] h-[8px] shrink-0 rounded-full bg-gold/80 shadow-[0_0_10px_rgba(200,149,42,0.8)]" />
                      <div className="text-[14px] text-text-main font-semibold leading-relaxed font-sans">
                        {spec}
                      </div>
                    </div>
                  ))}
                  {(!activeSet.description || activeSet.description.length === 0) && (
                    <div className="col-span-full py-6 text-center text-[13px] text-text-dim/60 font-semibold border border-dashed border-white/10 rounded-xl italic">
                      لا توجد مواصفات مُدخلة
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
          </AnimatePresence>
        </main>
      </div>

// Cleaned booking modal

      {isCartOpen && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex justify-end backdrop-blur-sm" onClick={() => setIsCartOpen(false)}>
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm h-full bg-dark-2 border-l border-gold/30 shadow-2xl flex flex-col"
          >
            <div className="p-5 border-b border-white/10 flex justify-between items-center bg-dark-3/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <ShoppingCart size={20} className="text-gold" /> السلة
              </h3>
              <button onClick={() => setIsCartOpen(false)} className="text-text-dim hover:text-white bg-dark-4 p-1.5 rounded-lg transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-5 custom-scrollbar">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-text-dim space-y-4">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                    <ShoppingCart size={32} className="opacity-50" />
                  </div>
                  <p className="font-semibold">السلة فارغة حالياً</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((cartItem, idx) => (
                    <div key={idx} className="flex gap-4 p-3 bg-dark-3 rounded-2xl border border-white/5">
                      <div className="w-20 h-20 bg-dark-4 rounded-xl overflow-hidden shrink-0">
                        {cartItem.item.images?.[0] ? (
                          <img src={cartItem.item.images[0]} className="w-full h-full object-cover" alt={cartItem.item.name} />
                        ) : (
                          <Armchair size={24} className="m-auto mt-6 text-white/20" />
                        )}
                      </div>
                      <div className="flex flex-col justify-between py-1 min-w-0 pr-1 flex-1">
                        <div>
                          <div className="text-sm font-bold text-white truncate">{cartItem.item.name}</div>
                          <div className="text-xs text-gold font-bold mt-1">
                            {cartItem.item.price ? cartItem.item.price.replace(/السعر\s*[:\-]*\s*/g, '').trim() : 'السعر غير محدد'}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <div className="flex items-center gap-2 bg-dark-4 rounded-lg p-1 border border-white/5">
                            <button 
                              onClick={() => handleAddToCart(cartItem.item, true)}
                              className="w-6 h-6 rounded flex items-center justify-center bg-white/5 hover:bg-gold hover:text-dark-1 transition-colors text-white"
                            >
                              +
                            </button>
                            <span className="text-xs font-bold text-white px-1 pt-0.5">{cartItem.quantity}</span>
                            <button 
                              onClick={() => handleAddToCart(cartItem.item, false)}
                              className="w-6 h-6 rounded flex items-center justify-center bg-white/5 hover:bg-red-500 hover:text-white transition-colors text-white"
                            >
                              -
                            </button>
                          </div>
                          <button 
                            onClick={() => handleRemoveFromCart(cartItem.item.id)}
                            className="text-[10px] text-red-400 hover:text-red-300 px-2 py-1 bg-red-500/10 rounded-lg transition-colors"
                          >
                            إزالة
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="p-5 border-t border-white/10 bg-dark-3/50">
                <button
                  onClick={() => {
                    const message = encodeURIComponent(`السلام عليكم، أحتاج للاستفسار أو حجز هذه المنتجات من الموقع:\n\n${cartItems.map((c, i) => `${i+1}- ${c.item.name} (الكمية: ${c.quantity})`).join('\n')}`);
                    const number = siteSettings.whatsappNumbers?.[0]?.number || '201090902911';
                    window.open(`https://wa.me/${number}?text=${message}`, '_blank');
                  }}
                  className="w-full bg-[#25D366] text-white font-extrabold py-3.5 rounded-xl flex items-center justify-center gap-2 hover:bg-[#20bd5a] transition-all shadow-[0_4px_20px_rgba(37,211,102,0.3)]"
                >
                  <MessageCircle size={20} /> متابعة عبر واتساب
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
