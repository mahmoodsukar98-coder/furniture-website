import React, { useRef, useImperativeHandle, forwardRef, useState } from 'react';
import { FurnitureSet, SiteSettings } from '../types';
import { jsPDF } from 'jspdf';

interface Props {
  sets: FurnitureSet[];
  settings: SiteSettings;
}

export interface PdfTemplateRef {
  generatePdf: () => Promise<string | null>;
}

const imageToBase64 = async (url: string): Promise<string> => {
  try {
    const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (!res.ok) throw new Error('proxy fetch failed: ' + res.status);
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (err) {
    console.error('Failed to convert image to base64', url, err);
    return url;
  }
};

/* ─── Shared tokens (Luxury Editorial Theme matching Site) ──────────── */
const C = {
  bg:       '#101010',
  surface:  '#161616',
  surface2: '#1a1a1a',
  surface3: '#222222',
  gold:     '#C8952A',
  goldL:    '#e0b44f',
  goldBorder:'rgba(200, 149, 42, 0.4)',
  white:    '#F2EFE9',
  dim:      '#C4BCB3',
  dimL:     '#888888',
  line:     'rgba(255,255,255,0.08)',
};

const getIconForSpec = (spec: string) => {
  if (spec.match(/[0-9]\/[0-9]/) || spec.includes('كنب') || spec.includes('مقعد')) {
    // Sofa / Seats
    return <path d="M4,7A2,2 0 0,0 2,9V16H4V18H6V16H18V18H20V16H22V9A2,2 0 0,0 20,7H17V5A1,1 0 0,0 16,4H8A1,1 0 0,0 7,5V7H4M7,7V6H17V7H7M4,9H20V14H4V9Z" />;
  }
  if (spec.includes('خشب') || spec.includes('زان')) {
    // Wood / Tree
    return <path d="M12,2L22,7L12,12L2,7L12,2M12,15.5L2,10.5L4.5,9.25L12,13L19.5,9.25L22,10.5L12,15.5M12,19L2,14L4.5,12.75L12,16.5L19.5,12.75L22,14L12,19Z" />;
  }
  if (spec.includes('سفنج') || spec.includes('كثافة')) {
    // Foam/Layers
    return <path d="M17,1H7A2,2 0 0,0 5,3V21A2,2 0 0,0 7,23H17A2,2 0 0,0 19,21V3A2,2 0 0,0 17,1M17,21H7V3H17V21M9,5H15V7H9V5M9,17H15V19H9V17Z" />;
  }
  if (spec.includes('دهان') || spec.includes('بوليستر')) {
    // Paint Brush
    return <path d="M19 3H22V14H20V12H18V15H15V12H13V15H11V12H9V15H6V12H4V14H2V3H19M4 5V10H6V7H9V10H11V7H13V10H15V7H18V10H20V5H4M16.5 16C15.67 16 15 16.67 15 17.5V20.5C15 21.33 15.67 22 16.5 22C17.33 22 18 21.33 18 20.5V17.5C18 16.67 17.33 16 16.5 16Z" />;
  }
  if (spec.includes('ظه') || spec.includes('متحرك') || spec.includes('ميكانيزم')) {
    // Adjust / Mechanism
    return <path d="M8,1H16V3H8V1M17,5V19C17,20.11 16.11,21 15,21H9C7.89,21 7,20.11 7,19V5C7,3.89 7.89,3 9,3H15C16.11,3 17,3.89 17,5M15,5H9V19H15V5Z" />;
  }
  if (spec.includes('قماش') || spec.includes('بوكلت') || spec.includes('كتان')) {
    // Fabric
    return <path d="M12,18H6V14H12M21,14V12L20,7H4L3,12V14H4V20H14V14H18V20H20V14M20,4H4V6H20V4Z" />;
  }
  // Default general check
  return <path d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />;
};

/* ─── Page wrapper ────────────────────────────────────── */
const Page: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    className="pdf-page"
    dir="rtl"
    style={{
      width: '794px',
      height: '1123px',
      background: `linear-gradient(135deg, #18181A 0%, #080808 100%)`,
      boxSizing: 'border-box',
      fontFamily: 'Cairo, Arial, sans-serif',
      position: 'relative',
      overflow: 'hidden',
      padding: '40px',
      ...style,
    }}
  >
    {/* Subtle Luxury Pattern / Texture Overlay */}
    <div style={{
      position: 'absolute', inset: 0, opacity: 0.05,
      backgroundImage: `radial-gradient(circle at 50% 50%, rgba(200, 149, 42, 0.4) 1px, transparent 1.5px)`,
      backgroundSize: '24px 24px', pointerEvents: 'none'
    }} />
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      zIndex: 1,
    }}>
      {children}
    </div>
  </div>
);

/* ─── SukarLogo Square ────────────────────────────────── */
const SukarLogoSquare = () => (
  <div style={{
    width: 80, height: 80,
    borderRadius: 16,
    background: 'linear-gradient(145deg, #A84931 0%, #853723 100%)',
    border: `1px solid rgba(255,255,255,0.05)`,
    boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    marginBottom: 40
  }}>
    <div style={{
       display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
    }}>
       <span style={{color:'#fff', fontSize: 13, fontWeight:900, fontFamily:'Arial, sans-serif'}}>SUKAR</span>
       <span style={{color:'rgba(255,255,255,0.8)', fontSize: 7, fontWeight:700, fontFamily:'Arial, sans-serif', marginTop:1, letterSpacing: 1}}>FURNITURE</span>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════
   INDEX PAGE (Combined Cover + Index)
══════════════════════════════════════════════════════ */
const IndexPage: React.FC<{ sets: FurnitureSet[]; aboutSet: any; settings: SiteSettings }> = ({ sets, aboutSet, settings }) => {
  const CHUNK_SIZE_FIRST_PAGE = 8;
  const CHUNK_SIZE_OTHER_PAGES = 14;
  const chunks = [];
  
  if (sets.length === 0) {
    chunks.push([]);
  } else {
    chunks.push(sets.slice(0, CHUNK_SIZE_FIRST_PAGE));
    for (let i = CHUNK_SIZE_FIRST_PAGE; i < sets.length; i += CHUNK_SIZE_OTHER_PAGES) {
      chunks.push(sets.slice(i, i + CHUNK_SIZE_OTHER_PAGES));
    }
  }

  const aboutDescription = aboutSet?.description?.length > 0 ? aboutSet.description : [
    'منذ عام 2005، انطلقت شركة سكر للأثاث لتقدم مفهوماً متكاملاً للأناقة والراحة.',
    'نحن نجمع بين أصالة التصميم المحلي وأعلى معايير جودة التصنيع العالمية، لنضع بين يديك أثاثاً عصرياً يثري مساحاتك، ويثبت جدارته في السوق المحلي وأسواق التصدير العالمية.'
  ];

  return (
    <>
      {chunks.map((chunk, pageIndex) => (
        <Page key={pageIndex}>
          <div style={{ padding: '60px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            
            {pageIndex === 0 && (
              <>
                <SukarLogoSquare />

                <div style={{
                  fontSize: 42, 
                  fontWeight: 900, 
                  color: C.gold,
                  fontFamily: 'serif', 
                  marginBottom: 32, 
                  letterSpacing: 6,
                  textShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  background: 'linear-gradient(to bottom, #F9D976 0%, #E0B44F 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}>
                  {settings.siteName || 'SUKAR FURNITURE'}
                </div>

                <div style={{
                  width: '100%', maxWidth: 720,
                  textAlign: 'center', marginBottom: 70,
                  display: 'flex', flexDirection: 'column', gap: 14
                }}>
                  {aboutDescription.map((p: string, i: number) => (
                    <p key={i} style={{ 
                      fontSize: 14, 
                      color: 'rgba(255,255,255,0.85)', 
                      lineHeight: 1.9, 
                      margin: 0, 
                      fontWeight: 300, 
                      fontFamily: 'Cairo, Arial, sans-serif' 
                    }}>
                      {p}
                    </p>
                  ))}
                </div>
              </>
            )}

            <div style={{
              fontSize: 22, fontWeight: 900, color: C.gold,
              fontFamily: 'serif', letterSpacing: 5, marginBottom: 32,
              marginTop: pageIndex > 0 ? 40 : 0,
              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}>
              COLLECTION INDEX
            </div>

            <div style={{
              width: '100%', maxWidth: 800,
              background: 'linear-gradient(135deg, rgba(30,30,30,0.6) 0%, rgba(20,20,20,0.8) 100%)',
              borderRadius: 20,
              padding: '8px 0',
              backdropFilter: 'blur(12px)',
              border: `1px solid rgba(200, 149, 42, 0.15)`,
              boxShadow: '0 16px 40px rgba(0,0,0,0.4)'
            }}>
              {chunk.map((set, idx) => {
                const globalIdx = pageIndex === 0 ? idx + 1 : CHUNK_SIZE_FIRST_PAGE + (pageIndex - 1) * CHUNK_SIZE_OTHER_PAGES + idx + 1;
                return (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '20px 32px',
                    borderBottom: idx === chunk.length - 1 ? 'none' : `1px solid rgba(255,255,255,0.06)`,
                    direction: 'rtl'
                  }}>
                    {/* Visual Right: Name & Index */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
                      <span style={{ color: C.gold, fontSize: 16, fontWeight: 900, fontFamily: 'serif' }}>
                        {globalIdx.toString().padStart(2, '0')}
                      </span>
                      <span style={{ color: C.white, fontSize: 18, fontWeight: 700, fontFamily: 'Cairo, Arial, sans-serif' }}>{set.name}</span>
                    </div>

                    {/* Visual Left: Price */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, direction: 'ltr' }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, letterSpacing: 2, fontFamily: 'Arial, sans-serif', fontWeight: 600 }}>PRICE</span>
                      <span style={{ color: C.gold, fontSize: 18, fontWeight: 700, fontFamily: 'Cairo, Arial, sans-serif', minWidth: 80, textAlign: 'right' }}>
                        {set.price !== 'تواصل معنا' ? `${set.price.replace(/[^0-9٠-٩]/g, '')} ج` : '---'}
                      </span>
                    </div>
                  </div>
                );
              })}
              {chunk.length === 0 && (
                <div style={{ padding: '30px', textAlign: 'center', color: C.dim }}>لا توجد أطقم متاحة حالياً</div>
              )}
            </div>
            
          </div>
        </Page>
      ))}
    </>
  );
};

/* ══════════════════════════════════════════════════════
   SET PAGE
══════════════════════════════════════════════════════ */
const SetPage: React.FC<{
  set: FurnitureSet;
  idx: number;
  total: number;
  imageMap: Record<string, string>;
  settings: SiteSettings;
  catalogSets: FurnitureSet[];
}> = ({ set, idx, total, imageMap, settings, catalogSets }) => {
  const imgs = (set.images || []).slice(0, 4);
  const hasImages = imgs.length > 0;
  
  const whatsappNums = settings.whatsappNumbers?.length > 0 
    ? settings.whatsappNumbers.map(n => n.number).join(' - ') 
    : '01090902911 - 01090903482'; // Fallback

  const formattedPrice = set.price !== 'تواصل معنا' ? set.price.replace(/[^0-9٠-٩]/g, '') : '';

  return (
    <Page style={{ padding: 0 }}>
      {/* THE GOLD FRAME CACHE */}
      <div style={{
         margin: '20px',
         height: '1083px',
         border: `1.5px solid rgba(200, 149, 42, 0.6)`,
         borderRadius: '24px',
         padding: '24px',
         display: 'flex',
         flexDirection: 'column',
         boxSizing: 'border-box',
         position: 'relative'
      }}>
        {/* ── HEADER ── */}
        <div style={{ 
           background: C.gold,
           borderRadius: 24,
           padding: '0 40px',
           display: 'flex',
           alignItems: 'center',
           justifyContent: 'space-between',
           direction: 'rtl',
           height: '140px',
           flexShrink: 0,
           marginBottom: '32px',
        }}>
           
           {/* Right (Visual Right in RTL): Name and WhatsApp */}
           <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center' }}>
              <div style={{ 
                  fontSize: 48, fontWeight: 900, color: '#fff', 
                  marginBottom: 16, fontFamily: 'Cairo, Arial, sans-serif',
                  whiteSpace: 'nowrap'
              }}>
                 {set.name}
              </div>
              <div style={{ 
                  display: 'flex', alignItems: 'center', gap: 12, 
                  background: 'rgba(255,255,255,0.2)', padding: '8px 24px', 
                  borderRadius: 100, whiteSpace: 'nowrap'
              }}>
                 <span style={{ fontSize: 18, fontWeight: 900, color: '#111', direction: 'ltr', fontFamily: 'Arial, sans-serif' }}>
                    {whatsappNums}
                 </span>
                 <svg width="22" height="22" fill="none" stroke="#111" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
                 </svg>
              </div>
           </div>

           {/* Center: Price Box */}
           <div style={{ 
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(255,255,255,0.15)',
              border: '2px solid rgba(255,255,255,0.4)',
              borderRadius: 24,
              padding: '16px 48px',
              minWidth: 220,
           }}>
              <div style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.9)', marginBottom: 8, fontFamily: 'Cairo, Arial, sans-serif' }}>السعر</div>
              <div style={{ fontSize: formattedPrice ? 38 : 32, fontWeight: 900, color: '#fff', direction: 'rtl', marginBottom: formattedPrice ? 8 : 0, fontFamily: 'Cairo, Arial, sans-serif', whiteSpace: 'nowrap' }}>
                 {formattedPrice ? `${formattedPrice}` : 'تواصل معنا'}
              </div>
              {formattedPrice && <div style={{ fontSize: 16, fontWeight: 800, color: 'rgba(255,255,255,0.9)', fontFamily: 'Cairo, Arial, sans-serif' }}>جنيه مصري</div>}
           </div>

           {/* Left (Visual Left in RTL): Logo */}
           <div style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 104, height: 104, borderRadius: '50%',
              background: '#8C2711',
              border: '4px solid #fff',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
           }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginTop: -4 }}>
                 <div style={{ position: 'relative', width: 44, height: 40, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <svg width="30" height="18" viewBox="0 0 40 24" style={{ position: 'absolute', bottom: 2, opacity: 0.15 }}>
                      <path d="M4 12V20H8V24H12V20H28V24H32V20H36V12C36 8 32 6 28 6H12C8 6 4 8 4 12Z" fill="#fff"/>
                    </svg>
                    <span style={{ fontSize: 44, fontWeight: 900, color: '#fff', fontFamily: 'serif', fontStyle: 'italic', lineHeight: 1, zIndex: 1 }}>S</span>
                 </div>
                 <div style={{ fontSize: 14, fontWeight: 900, color: '#fff', letterSpacing: 2, marginTop: 2, fontFamily: 'Arial, sans-serif' }}>SUKAR</div>
                 <div style={{ fontSize: 6, fontWeight: 700, color: '#fff', letterSpacing: 3, fontFamily: 'Arial, sans-serif' }}>FURNITURE</div>
              </div>
           </div>

        </div>

        {/* ── IMAGES (4 Grid) ── */}
        {hasImages && (
          <div style={{
             height: '560px',
             display: 'grid',
             gridTemplateColumns: imgs.length > 1 ? '1fr 1fr' : '1fr',
             gridTemplateRows: imgs.length > 2 ? '1fr 1fr' : '1fr',
             gap: 16,
             marginBottom: '24px',
             flexShrink: 0
          }}>
             {imgs.map((img, i) => (
                <div key={i} style={{ position: 'relative', width: '100%', height: '100%', borderRadius: 16, overflow: 'hidden' }}>
                   <ImageCell src={img} map={imageMap} style={{ width: '100%', height: '100%' }} />
                    <div style={{
                      position: 'absolute', bottom: 12, left: 12,
                      background: 'rgba(0,0,0,0.6)',
                      backdropFilter: 'blur(4px)',
                      color: C.gold,
                      fontSize: 20, fontWeight: 900, fontFamily: 'serif',
                      padding: '4px 16px',
                      borderRadius: 12,
                      border: `1px solid rgba(200, 149, 42, 0.4)`,
                      letterSpacing: 1
                    }}>
                      {(i + 1).toString().padStart(2, '0')}
                    </div>
                </div>
             ))}
          </div>
        )}

        {/* ── SPECS ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
           <div style={{ display: 'flex', justifyContent: 'flex-start', alignItems: 'flex-end', marginBottom: 16, direction: 'rtl' }}>
              {/* Right: Specs Title */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                 <svg width="20" height="20" fill={C.gold} viewBox="0 0 24 24">
                    <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z" />
                 </svg>
                 <span style={{ fontSize: 20, fontWeight: 900, color: C.gold, letterSpacing: 0 }}>المواصفات الفنية</span>
              </div>
           </div>

           {set.description && set.description.length > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16, direction: 'rtl' }}>
                 {set.description.map((spec, i) => (
                    <div key={i} style={{ 
                       border: `1.5px solid ${C.goldBorder}`,
                       borderRadius: 16,
                       padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'flex-start',
                       background: 'linear-gradient(135deg, rgba(200,149,42,0.05) 0%, rgba(20,20,20,0.8) 100%)',
                       position: 'relative',
                       overflow: 'hidden'
                    }}>
                       <div style={{
                         position: 'absolute', right: 0, top: 0, bottom: 0, width: 4, background: C.gold
                       }} />
                       <div style={{ 
                          width: 32, height: 32, borderRadius: 8, background: 'rgba(200, 149, 42, 0.1)',
                          border: `1px solid rgba(200, 149, 42, 0.3)`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                       }}>
                          <svg width="18" height="18" fill={C.gold} viewBox="0 0 24 24">
                             {getIconForSpec(spec)}
                          </svg>
                       </div>
                       <span style={{ fontSize: 16, fontWeight: 700, color: C.white, textAlign: 'right', flex: 1, padding: '0 16px', lineHeight: 1.5 }}>
                         {spec}
                       </span>
                       {/* Subtle ornate flourish overlay */}
                       <svg width="40" height="40" viewBox="0 0 24 24" style={{ position: 'absolute', left: -10, bottom: -10, opacity: 0.05, fill: C.gold }}>
                         <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                       </svg>
                    </div>
                 ))}
              </div>
           )}
        </div>

        {/* FOOTER */}
        <div style={{ position: 'absolute', bottom: 12, right: 24, fontSize: 12, color: C.dim, fontWeight: 700, direction: 'rtl' }}>
           {`Sukar Furniture © 2026`}
        </div>
        <div style={{ position: 'absolute', bottom: 12, left: 24, fontSize: 12, color: C.dim, fontWeight: 700, direction: 'rtl' }}>
           {`طقم ${idx + 1} / ${total}`}
        </div>
      </div>
    </Page>
  );
};

/* ── Image cell helper ── */
const ImageCell: React.FC<{
  src: string;
  map: Record<string, string>;
  style?: React.CSSProperties;
}> = ({ src, map, style }) => (
  <div style={{
    position: 'relative',
    background: '#1a1a1a',
    ...style,
  }}>
    {map[src] ? (
      <img
        src={map[src]}
        crossOrigin="anonymous"
        style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }}
        alt=""
      />
    ) : (
      <div style={{
        position: 'absolute', inset: 0,
        display:'flex', alignItems:'center', justifyContent:'center',
        fontSize:12, color:C.dim,
      }}>
        جاري التهيئة...
      </div>
    )}
    <div style={{
       position: 'absolute', bottom: 16, left: 0, right: 0,
       display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
       opacity: 0.85
    }}>
       <div style={{ fontSize: 32, fontWeight: 900, color: 'rgba(255,255,255,0.85)', fontFamily: 'serif', fontStyle: 'italic', marginRight: 4, lineHeight: 0.8 }}>S</div>
       <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: 'rgba(255,255,255,0.9)', fontFamily: 'Arial', letterSpacing: 2 }}>SUKAR</div>
          <div style={{ fontSize: 6, fontWeight: 700, color: 'rgba(255,255,255,0.7)', fontFamily: 'Arial', letterSpacing: 4 }}>FURNITURE</div>
       </div>
    </div>
  </div>
);

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
const PdfTemplate = forwardRef<PdfTemplateRef, Props>(({ sets, settings }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});

  const aboutSet = sets.find(s => s.isAbout);
  const catalogSets = sets.filter(s => !s.isAbout && !s.isHidden);

  useImperativeHandle(ref, () => ({
    generatePdf: async () => {
      try {
        if (!containerRef.current) throw new Error('No container');

        const allUrls: string[] = catalogSets.flatMap(s => (s.images || []).slice(0, 4));
        const uniqueUrls = Array.from(new Set<string>(allUrls));

        const entries = await Promise.all(
          uniqueUrls.map(async (url: string) => {
            const b64 = await imageToBase64(url);
            return [url, b64] as [string, string];
          })
        );

        const map: Record<string, string> = {};
        entries.forEach(([url, b64]) => { if (b64) map[url] = b64; });
        setImageMap(map);

        await new Promise(resolve => setTimeout(resolve, 2500));

        const html2canvas = (await import('html2canvas')).default;
        const pages = containerRef.current.querySelectorAll('.pdf-page');
        if (pages.length === 0) throw new Error('No pages found');

        const doc = new jsPDF({ orientation: 'p', unit: 'px', format: [794, 1123] });

        for (let i = 0; i < pages.length; i++) {
          const page = pages[i] as HTMLElement;
          const canvas = await html2canvas(page, {
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: C.bg,
            width: 794, height: 1123,
            logging: false,
            scrollX: 0, scrollY: 0,
            windowWidth: 794, windowHeight: 1123,
            x: 0, y: 0,
          });
          const imgData = canvas.toDataURL('image/jpeg', 0.92);
          if (i > 0) doc.addPage();
          doc.addImage(imgData, 'JPEG', 0, 0, 794, 1123);
          
          await new Promise(resolve => setTimeout(resolve, 100)); // small delay to yield thread
        }

        const blob = doc.output('blob');
        return URL.createObjectURL(blob);

      } catch (err: any) {
        console.error('PDF Error:', err?.message || err);
        throw new Error(err?.message || 'PDF Generate Error');
      }
    }
  }));

  return (
    <div style={{
      position: 'fixed',
      top: '0px',
      left: '-9999px',
      width: '794px',
      pointerEvents: 'none',
      zIndex: -1,
    }}>
      <div ref={containerRef} style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>

        <IndexPage sets={catalogSets} aboutSet={aboutSet} settings={settings} />

        {catalogSets.map((set, idx) => (
          <SetPage
            key={set.id ?? idx}
            set={set}
            idx={idx}
            total={catalogSets.length}
            imageMap={imageMap}
            settings={settings}
            catalogSets={catalogSets}
          />
        ))}

      </div>
    </div>
  );
});

export default PdfTemplate;
