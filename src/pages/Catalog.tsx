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
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: any) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstallable(false);
    }
    setDeferredPrompt(null);
  };

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
    <div className="flex flex-col h-[100dvh] overflow-hidden bg-dark text-text-main font-sans selection:bg-gold/30 print-container">
      {/* Header */}
      <header className="glass-panel flex shrink-0 items-center justify-between px-4 z-50 shadow-[0_4px_30px_rgba(0,0,0,0.5)] hide-on-print relative border-b border-gold/10" style={{ paddingTop: 'env(safe-area-inset-top)', minHeight: 'calc(68px + env(safe-area-inset-top))', paddingBottom: '16px', paddingTop: 'max(16px, env(safe-area-inset-top))' }}>
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
            <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${siteSettings.contactEmail}`} target="_blank" rel="noreferrer" className="hidden sm:flex w-9 h-9 items-center justify-center bg-dark-3 border-[1.5px] border-white/10 rounded-lg text-white font-bold hover:bg-white/10 hover:text-gold transition-all shadow-[0_0_10px_rgba(0,0,0,0.2)]" title="راسلنا عبر البريد الإلكتروني">
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
          
          {isInstallable && (
            <button 
              onClick={handleInstallClick} 
              className="flex sm:hidden h-9 px-3 items-center gap-2 bg-gradient-to-r from-gold/80 to-gold border border-gold-l/50 rounded-lg text-dark-1 text-[11px] font-black tracking-wide shadow-[0_3px_14px_rgba(200,149,42,0.35)] hover:-translate-y-0.5 transition-all"
            >
              <Download size={14} className="animate-bounce" /> 
              تثبيت
            </button>
          )}

        </div>
      </header>

      <div className="flex flex-1 relative overflow-hidden main-content-wrapper">
        {isSidebarOpen && (
          <div className="fixed inset-0 bg-black/80 z-40 md:hidden backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={cn(
          "fixed md:relative top-0 bottom-0 md:h-full w-[85vw] md:w-[300px] glass-panel border-r border-gold/10 flex flex-col shrink-0 z-50 transition-transform duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] md:translate-x-0 right-0 max-w-[400px]",
          isSidebarOpen ? "translate-x-0 shadow-[-20px_0_50px_rgba(0,0,0,0.5)]" : "translate-x-full md:shadow-none"
        )} style={{ paddingTop: 'env(safe-area-inset-top)', paddingBottom: 'env(safe-area-inset-bottom)' }}>
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
                    <img src={set.images[0]} alt={set.name} loading="lazy" className="w-full h-full object-cover mix-blend-luminosity opacity-80 group-hover:mix-blend-normal group-hover:opacity-100 transition-all duration-500" />
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
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="flex-1 flex flex-col items-center py-20 px-4 sm:px-8 min-h-screen relative overflow-y-auto bg-[#121212] bg-[radial-gradient(circle_at_50%_0%,rgba(40,40,40,1)_0%,rgba(18,18,18,1)_100%)] w-full"
            >
              {/* Elegant central logo - Refined Copper-Terracotta finish */}
              <div className="relative z-10 flex flex-col items-center w-full max-w-3xl mx-auto mb-14 mt-8">
                <div className="w-[80px] h-[80px] rounded-2xl bg-gradient-to-br from-[#B85338] to-[#8A3722] border-[1.5px] border-white/10 flex items-center justify-center mb-10 shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_2px_10px_rgba(255,255,255,0.2)]">
                  <div className="flex flex-col items-center justify-center">
                    <span className="text-white text-[13px] font-black font-inter tracking-wide leading-none">SUKAR</span>
                    <span className="text-white/80 text-[7px] font-bold font-inter tracking-[2px] leading-none mt-1">FURNITURE</span>
                  </div>
                </div>
                
                {/* Brand Name - Metallic Brushed Gold */}
                <h1 className="text-[36px] md:text-[46px] font-serif font-bold text-transparent bg-clip-text bg-gradient-to-b from-[#FFF2B2] via-[#D4AF37] to-[#AA7C11] mb-8 tracking-[6px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] text-center">
                  SUKAR FURNITURE
                </h1>
                
                {/* Intro text - Clean, thin white/silver Arabic */}
                <div className="text-center leading-[2] text-[15px] md:text-[17px] font-sans text-[#E0E0E0] max-w-2xl font-light tracking-wide space-y-4">
                  {activeSet.description.map((p, i) => <p key={i} className="drop-shadow-sm">{p}</p>)}
                </div>
              </div>

              {/* The Index Menu */}
              <div className="w-full max-w-[850px] mx-auto relative z-10 flex flex-col gap-10 mt-6">
                <div className="text-center font-serif text-[20px] md:text-[24px] text-[#D4AF37] tracking-[5px] uppercase font-bold drop-shadow-md">
                  Collection Index
                </div>
                
                {/* Index Card - Sleek dark glassmorphism */}
                <div className="bg-gradient-to-b from-[#1E1E1E]/90 to-[#121212]/95 backdrop-blur-xl border border-[#D4AF37]/20 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.6)] overflow-hidden relative w-full mb-10">
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxmaWx0ZXIgaWQ9Im4iPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjM1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIi8+PC9zdmc+')] opacity-[0.03] pointer-events-none mix-blend-overlay"></div>
                  
                  <div className="flex flex-col relative z-10">
                    {sets.filter(s => !s.isAbout).map((item, idx, arr) => (
                      <div 
                        key={item.id} 
                        onClick={() => setActiveSetId(item.id)}
                        className={cn(
                          "flex items-center justify-between p-6 md:px-10 transition-all duration-300 cursor-pointer group relative hover:bg-[#D4AF37]/5",
                          idx !== arr.length - 1 ? "border-b border-[#D4AF37]/10" : ""
                        )}
                      >
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#D4AF37] scale-y-0 group-hover:scale-y-100 transition-transform origin-center"></div>
                        <div className="flex items-center gap-6">
                          <span className="text-[#D4AF37]/80 font-serif text-[18px] md:text-[20px] font-bold group-hover:text-[#D4AF37] transition-colors tracking-wider w-8 text-center drop-shadow-sm">
                            {(idx + 1).toString().padStart(2, '0')}
                          </span>
                          <span className="text-white font-sans text-[18px] md:text-[22px] font-bold group-hover:text-[#F9F9F9] transition-colors tracking-wide">
                            {item.name}
                          </span>
                        </div>
                        {item.price && (
                          <div className="flex items-center gap-4 text-left mr-auto dir-ltr">
                            <span className="text-[10px] md:text-[11px] font-inter text-white/40 uppercase tracking-[3px] font-semibold mt-1">Price</span>
                            <span className="text-[#D4AF37] font-sans font-bold text-[18px] md:text-[22px] tracking-wide drop-shadow-md">
                               {item.price.replace(/السعر\s*[:\-]*\s*/g, '').trim()}
                            </span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Contact section */}
              <div className="flex flex-wrap gap-4 justify-center w-full max-w-2xl mx-auto mt-10 relative z-10 pb-20">
                {siteSettings.whatsappNumbers && siteSettings.whatsappNumbers.length > 0 ? (
                  siteSettings.whatsappNumbers.map((num, i) => (
                    <a key={i} href={`https://wa.me/${num.number}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-[#1A1A1A] border border-[#D4AF37]/30 rounded-xl px-6 py-3.5 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/60 transition-all shadow-lg hover:-translate-y-1 group">
                      <Smartphone size={18} className="text-[#D4AF37] group-hover:scale-110 transition-transform"/>
                      <span className="text-[14px] font-inter font-bold text-[#E0E0E0] tracking-wider">{num.label ? num.label : num.number}</span>
                    </a>
                  ))
                ) : (
                  <>
                    <a href="https://wa.me/201090902911" target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-[#1A1A1A] border border-[#D4AF37]/30 rounded-xl px-6 py-3.5 hover:bg-[#D4AF37]/10 hover:border-[#D4AF37]/60 transition-all shadow-lg hover:-translate-y-1 group">
                      <Smartphone size={18} className="text-[#D4AF37] group-hover:scale-110 transition-transform"/>
                      <span className="text-[14px] font-inter font-bold text-[#E0E0E0] tracking-wider">01090902911</span>
                    </a>
                  </>
                )}
                {siteSettings.socialLinks?.map((link, i) => (
                    <a key={i} href={link.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-[#1A1A1A] border border-white/10 rounded-xl px-6 py-3.5 hover:bg-white/10 transition-all hover:-translate-y-1 group">
                      <MessageCircle size={18} className="text-white/70 group-hover:text-white transition-colors" />
                      <span className="text-[14px] font-bold text-[#E0E0E0]">{link.platform}</span>
                    </a>
                ))}
              </div>
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

      {isCartOpen && (
        <div className="fixed inset-0 bg-[#080808]/90 z-[100] flex justify-end backdrop-blur-md transition-opacity" onClick={() => setIsCartOpen(false)}>
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md h-full bg-[#121212] border-l border-[#D4AF37]/20 shadow-[-20px_0_50px_rgba(0,0,0,0.8)] flex flex-col relative overflow-hidden"
          >
            {/* Background texture overlay */}
            <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxMDAlIiBoZWlnaHQ9IjEwMCUiPjxmaWx0ZXIgaWQ9Im4iPjxmZVR1cmJ1bGVuY2UgdHlwZT0iZnJhY3RhbE5vaXNlIiBiYXNlRnJlcXVlbmN5PSIwLjM1IiBzdGl0Y2hUaWxlcz0ic3RpdGNoIi8+PC9maWx0ZXI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsdGVyPSJ1cmwoI24pIi8+PC9zdmc+')] opacity-[0.03] pointer-events-none mix-blend-overlay z-0"></div>
            
            <div className="p-6 md:p-8 border-b border-white/5 flex justify-between items-center bg-[#1A1A1A] relative z-10 shadow-[0_4px_20px_rgba(0,0,0,0.3)]">
              <h3 className="text-xl font-bold font-serif tracking-widest text-[#FFF2B2] flex items-center gap-3 drop-shadow-sm uppercase">
                <ShoppingCart size={22} className="text-[#D4AF37]" /> Shopping Cart
              </h3>
              <button onClick={() => setIsCartOpen(false)} className="text-[#E0E0E0] hover:text-white bg-white/5 hover:bg-[#D4AF37]/10 p-2 rounded-xl transition-all border border-transparent hover:border-[#D4AF37]/30">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar relative z-10 space-y-4">
              {cartItems.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-white/40 space-y-5">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center border border-white/5 shadow-inner">
                    <ShoppingCart size={36} className="opacity-40 text-[#D4AF37]" />
                  </div>
                  <p className="font-semibold font-sans tracking-wide">Your cart is currently empty.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((cartItem, idx) => (
                    <div key={idx} className="flex gap-5 p-4 bg-[#1A1A1A] rounded-2xl border border-white/5 hover:border-[#D4AF37]/20 hover:bg-[#1C1C1C] transition-all shadow-[0_4px_15px_rgba(0,0,0,0.2)] group hover:-translate-y-0.5">
                      <div className="w-[85px] h-[85px] bg-[#121212] rounded-xl overflow-hidden shrink-0 border border-white/5 shadow-inner relative">
                        {cartItem.item.images?.[0] ? (
                          <img src={cartItem.item.images[0]} className="w-full h-full object-cover mix-blend-lighten group-hover:mix-blend-normal transition-all" alt={cartItem.item.name} />
                        ) : (
                          <Armchair size={28} className="m-auto mt-8 text-white/20" />
                        )}
                      </div>
                      <div className="flex flex-col justify-between py-1 min-w-0 pr-1 flex-1">
                        <div>
                          <div className="text-[17px] font-bold text-white truncate font-sans tracking-wide drop-shadow-sm">{cartItem.item.name}</div>
                          <div className="text-[14px] text-[#D4AF37] font-bold mt-1 font-inter tracking-wider">
                            {cartItem.item.price ? cartItem.item.price.replace(/السعر\s*[:\-]*\s*/g, '').trim() : 'السعر غير محدد'}
                          </div>
                        </div>
                        <div className="flex items-center justify-between mt-3">
                          <div className="flex items-center gap-1.5 bg-[#121212] rounded-lg p-1 border border-white/5 shadow-sm">
                            <button 
                              onClick={() => handleAddToCart(cartItem.item, true)}
                              className="w-7 h-7 rounded-md flex items-center justify-center bg-white/5 hover:bg-[#D4AF37] hover:text-[#121212] transition-colors text-white font-bold"
                            >
                              +
                            </button>
                            <span className="text-[13px] font-bold text-white px-2 pt-0.5 min-w-[24px] text-center font-inter">{cartItem.quantity}</span>
                            <button 
                              onClick={() => handleAddToCart(cartItem.item, false)}
                              className="w-7 h-7 rounded-md flex items-center justify-center bg-white/5 hover:bg-white/20 hover:text-white transition-colors text-white font-bold"
                            >
                              -
                            </button>
                          </div>
                          <button 
                            onClick={() => handleRemoveFromCart(cartItem.item.id)}
                            className="text-[11px] text-red-400 hover:text-white px-3 py-1.5 bg-red-500/10 hover:bg-red-500/80 rounded-lg transition-colors font-bold tracking-wide"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cartItems.length > 0 && (
              <div className="p-6 md:p-8 border-t border-white/5 bg-[#1A1A1A] relative z-10 shadow-[0_-10px_30px_rgba(0,0,0,0.3)] pb-[calc(24px+env(safe-area-inset-bottom))]">
                <button
                  onClick={() => {
                    const message = encodeURIComponent(`السلام عليكم، أحتاج للاستفسار أو حجز هذه المنتجات من الموقع:\n\n${cartItems.map((c, i) => `${i+1}- ${c.item.name} (الكمية: ${c.quantity})`).join('\n')}`);
                    const number = siteSettings.whatsappNumbers?.[0]?.number || '201090902911';
                    window.open(`https://wa.me/${number}?text=${message}`, '_blank');
                  }}
                  className="w-full bg-gradient-to-r from-[#20bd5a] to-[#25D366] text-white font-black py-4 rounded-xl flex items-center justify-center gap-3 hover:brightness-110 transition-all shadow-[0_8px_25px_rgba(37,211,102,0.4)] hover:-translate-y-1 tracking-wider text-[15px]"
                >
                  <MessageCircle size={22} /> CHECKOUT VIA WHATSAPP
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </div>
  );
}
