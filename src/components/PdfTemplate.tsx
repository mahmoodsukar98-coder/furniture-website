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

/* ─── Shared tokens (Luxury Editorial Theme) ──────────── */
const C = {
  bg:       '#0F0F0F',
  surface:  '#141414',
  surface2: '#1A1A1A',
  gold:     '#D4AF37', // Pure luxury gold
  goldL:    '#F3E5AB', // Light gold
  goldDim:  'rgba(212, 175, 55, 0.08)',
  goldBorder:'rgba(212, 175, 55, 0.3)',
  white:    '#F8F8F8',
  dim:      '#999999',
  dimL:     '#BBBBBB',
  line:     'rgba(255,255,255,0.08)',
};

/* ─── Page wrapper ────────────────────────────────────── */
const Page: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    className="pdf-page"
    dir="rtl"
    style={{
      width: '794px',
      height: '1123px',
      backgroundColor: C.bg,
      boxSizing: 'border-box',
      fontFamily: 'Cairo, Arial, sans-serif',
      position: 'relative',
      overflow: 'hidden',
      padding: '40px',
      ...style,
    }}
  >
    <div style={{
      width: '100%',
      height: '100%',
      position: 'relative',
      backgroundColor: C.bg
    }}>
      {children}
    </div>
  </div>
);

/* ─── Page footer bar ─────────────────────────────────── */
const Footer: React.FC<{ right?: React.ReactNode }> = ({ right }) => (
  <div style={{
    position:'absolute', bottom:24, left:30, right:30,
    display:'flex', alignItems:'center', justifyContent:'space-between',
    zIndex: 11
  }}>
    <span style={{ fontSize:12, color:C.dimL, fontWeight:600, fontFamily: 'Arial, sans-serif' }}>
      Sukar Furniture © 2026
    </span>
    <span style={{ fontSize:13, color:C.white, fontWeight:700 }}>{right}</span>
  </div>
);

/* ─── SukarLogo ───────────────────────────────────────── */
const SukarLogoCircle = ({ size = 120 }: { size?: number }) => (
  <div style={{
    width: size, height: size,
    borderRadius: '50%',
    border: `2px solid ${C.gold}`,
    background: C.surface2,
    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
  }}>
    <div style={{ fontSize: size*0.25, fontWeight:900, color:C.white, lineHeight:1, fontFamily: 'Arial, sans-serif' }}>SUKAR</div>
    <div style={{ fontSize: size*0.12, fontWeight:600, color:C.gold, lineHeight:1, fontFamily: 'Arial, sans-serif', marginTop: 4 }}>FURNITURE</div>
  </div>
);

/* ══════════════════════════════════════════════════════
   COVER PAGE
══════════════════════════════════════════════════════ */
const CoverPage: React.FC<{ sets: FurnitureSet[]; settings: SiteSettings; count: number }> =
  ({ sets, settings, count }) => {
  const aboutSet = sets.find(s => s.isAbout);

  return (
    <Page>
      <div style={{
        position:'absolute', inset:0,
        display:'flex', flexDirection:'column',
        alignItems:'center',
        padding:'120px 40px',
      }}>
        
        <SukarLogoCircle size={140} />

        <div style={{
          fontSize: 60, fontWeight: 900, color: C.white,
          marginTop: 50, marginBottom: 12,
          textAlign: 'center', lineHeight: 1.2
        }}>
          {settings.siteName || 'Sukar Furniture'}
        </div>
        
        <div style={{
          fontSize: 22, fontWeight: 700, color: C.gold,
          textAlign: 'center', marginBottom: 30
        }}>
          كتالوج الأطقم 2026
        </div>

        {/* Divider */}
        <div style={{ width: 80, height: 2, background: C.gold, marginBottom: 70 }} />

        {/* About Section */}
        {aboutSet && (
          <>
            <div style={{ fontSize: 28, fontWeight: 900, color: C.gold, marginBottom: 24 }}>
              من نحن
            </div>
            <div style={{
              width: '100%', maxWidth: 600,
              background: C.surface,
              borderRadius: 24,
              padding: '36px 40px',
              border: `1px solid ${C.goldBorder}`,
              marginBottom: 50
            }}>
              {aboutSet.description?.map((p, i) => (
                <p key={i} style={{
                  fontSize: 16, color: C.white, lineHeight: 2.0,
                  margin: i === (aboutSet.description!.length - 1) ? 0 : '0 0 16px 0',
                  textAlign: 'center', fontWeight: 600
                }}>{p}</p>
              ))}
            </div>
          </>
        )}

        {/* Contact info below */}
        <div style={{ display:'flex', gap:20, justifyContent:'center', flexWrap: 'wrap', marginBottom: 70 }}>
          {(settings.whatsappNumbers?.length > 0 ? settings.whatsappNumbers : [{ number:'201090902911', label:'' }]).map((num, i) => (
            <div key={i} style={{
              display:'flex', alignItems:'center', gap:10,
              background: C.surface2,
              border: `1px solid ${C.goldBorder}`,
              borderRadius: 30,
              padding:'12px 28px',
            }}>
              <span style={{ fontSize:15, fontWeight:700, color:C.white, direction:'ltr' }}>
                {num.number}
              </span>
              <svg width="18" height="18" fill="none" stroke={C.gold} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
              </svg>
            </div>
          ))}
        </div>

        <div style={{ fontSize: 16, color: C.white, fontWeight: 700 }}>
          يحتوي على {count} طقم
        </div>
      </div>
    </Page>
  );
};

/* ══════════════════════════════════════════════════════
   INDEX PAGE
══════════════════════════════════════════════════════ */
const IndexPage: React.FC<{ sets: FurnitureSet[]; settings: SiteSettings }> = ({ sets, settings }) => (
  <Page>
    <div style={{ padding: '40px' }}>
      
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: 60 }}>
        <div>
          <div style={{ fontSize:40, fontWeight:900, color:C.white }}>فهرس الأطقم</div>
          <div style={{ fontSize:18, color:C.gold, fontWeight:700, marginTop:10 }}>
            كتالوج {settings.siteName || 'Sukar Furniture'} — 2026
          </div>
        </div>
        <SukarLogoCircle size={80} />
      </div>

      {/* List */}
      <div style={{ display:'flex', flexDirection:'column', gap: 4 }}>
        {/* Table header */}
        <div style={{ 
          display: 'grid', gridTemplateColumns: '80px 1fr 180px', 
          background: C.gold, color: '#000', 
          padding: '16px 20px', borderRadius: '8px 8px 0 0',
          fontWeight: 900, fontSize: 16
        }}>
           <div style={{ textAlign: 'center' }}>#</div>
           <div style={{ textAlign: 'right' }}>اسم الطقم</div>
           <div style={{ textAlign: 'center' }}>السعر</div>
        </div>

        {/* Table rows */}
        {sets.map((set, idx) => (
          <div key={idx} style={{ 
             display: 'grid', gridTemplateColumns: '80px 1fr 180px',
             background: idx % 2 === 0 ? C.surface : C.surface2,
             padding: '14px 20px', alignItems: 'center'
          }}>
             <div style={{ textAlign: 'center', color: C.white, fontWeight: 700, fontSize: 16 }}>
               {(idx + 1).toString()}
             </div>
             <div style={{ color: C.white, fontWeight: 700, fontSize: 18, textAlign: 'right' }}>
               {set.name}
             </div>
             <div style={{ display: 'flex', justifyContent: 'center' }}>
                {set.price && set.price !== 'تواصل معنا' ? (
                  <div style={{ 
                     background: C.surface, border: `1px solid ${C.goldBorder}`,
                     color: C.gold, fontWeight: 800, fontSize: 14,
                     padding: '8px 16px', borderRadius: 8
                  }}>
                    {set.price} <span style={{fontSize: 12, fontWeight: 600}}>ج.م</span>
                  </div>
                ) : (
                  <div style={{ 
                     background: C.surface, border: `1px solid ${C.line}`,
                     color: C.dim, fontWeight: 700, fontSize: 14,
                     padding: '8px 16px', borderRadius: 8
                  }}>
                    تواصل معنا
                  </div>
                )}
             </div>
          </div>
        ))}
      </div>
    </div>
  </Page>
);

/* ══════════════════════════════════════════════════════
   SET PAGE
══════════════════════════════════════════════════════ */
const SetPage: React.FC<{
  set: FurnitureSet;
  idx: number;
  total: number;
  imageMap: Record<string, string>;
  settings: SiteSettings;
}> = ({ set, idx, total, imageMap, settings }) => {
  const imgs = (set.images || []).slice(0, 4);
  const hasImages = imgs.length > 0;
  
  const whatsappNums = settings.whatsappNumbers?.length > 0 ? settings.whatsappNumbers.map(n => n.number).join(' - ') : '01090902911';

  return (
    <Page style={{ padding: 0 }}>
      {/* ── HEADER (Gold Background) ── */}
      <div style={{
        background: C.gold,
        padding: '24px 40px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomLeftRadius: 16,
        borderBottomRightRadius: 16,
        margin: '0 20px 20px 20px'
      }}>
        {/* Right side (Name + WhatsApp) */}
        <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
          <div style={{ fontSize: 36, fontWeight: 900, color: '#000' }}>{set.name}</div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: 8, direction: 'rtl' }}>
             <svg width="18" height="18" fill="none" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/>
             </svg>
             <span style={{ direction: 'ltr' }}>{whatsappNums}</span>
          </div>
        </div>

        {/* Center/Left Logo and Price */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
           <div style={{ 
              background: 'transparent', border: `2px solid rgba(0,0,0,0.15)`, borderRadius: 16,
              padding: '12px 32px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 2
           }}>
              <div style={{ fontSize: 14, fontWeight: 800, color: 'rgba(0,0,0,0.7)' }}>السعر</div>
              <div style={{ fontSize: 26, fontWeight: 900, color: '#000' }}>{set.price}</div>
              {set.price !== 'تواصل معنا' && <div style={{ fontSize: 13, fontWeight: 800, color: 'rgba(0,0,0,0.7)' }}>جنيه مصري</div>}
           </div>
           
           {/* Dark logo variant for the header */}
           <div style={{
              width: 90, height: 90, borderRadius: '50%',
              background: C.bg, border: `2px solid ${C.white}`,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
           }}>
              <div style={{ fontSize: 22, fontWeight:900, color:C.white, lineHeight:1, fontFamily: 'Arial, sans-serif' }}>SUKAR</div>
              <div style={{ fontSize: 11, fontWeight:700, color:C.gold, lineHeight:1, fontFamily: 'Arial, sans-serif', marginTop: 4 }}>FURNITURE</div>
           </div>
        </div>
      </div>

      {/* ── IMAGES (4 Grid) ── */}
      {hasImages && (
        <div style={{
          padding: '0 20px',
          height: 600,
          display: 'grid',
          gridTemplateColumns: imgs.length > 1 ? '1fr 1fr' : '1fr',
          gridTemplateRows: imgs.length > 2 ? '1fr 1fr' : '1fr',
          gap: 16
        }}>
          {imgs.map((img, i) => (
             <ImageCell key={i} src={img} map={imageMap} style={{ borderRadius: 16, width: '100%', height: '100%' }} />
          ))}
        </div>
      )}

      {/* ── SPECS ── */}
      {set.description && set.description.length > 0 && (
         <div style={{ padding: '32px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, paddingRight: 8 }}>
               <div style={{ width: 4, height: 20, background: C.gold }} />
               <span style={{ fontSize: 18, fontWeight: 900, color: C.gold }}>المواصفات الفنية</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
               {set.description.map((spec, i) => (
                  <div key={i} style={{ 
                     background: C.surface, border: `1px solid ${C.goldBorder}`, borderRadius: 12,
                     padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                     <span style={{ fontSize: 15, fontWeight: 700, color: C.white }}>{spec}</span>
                     <span style={{ color: C.gold, display: 'flex' }}>
                       <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                         <path d="M5,3L19,3C20.1,3 21,3.9 21,5L21,19C21,20.1 20.1,21 19,21L5,21C3.9,21 3,20.1 3,19L3,5C3,3.9 3.9,3 5,3M13,6L11,6L11,10L7,10L7,12L11,12L11,16L13,16L13,12L17,12L17,10L13,10L13,6Z" />
                       </svg>
                     </span>
                  </div>
               ))}
            </div>
         </div>
      )}

      <Footer right={`طقم ${idx + 1} / ${total}`} />
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
    background: '#111',
    border: `1px solid ${C.goldBorder}`,
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
  </div>
);

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
const PdfTemplate = forwardRef<PdfTemplateRef, Props>(({ sets, settings }, ref) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});

  const aboutSet   = sets.find(s => s.isAbout);
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

        await new Promise(resolve => setTimeout(resolve, 2000));

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
          await new Promise(resolve => setTimeout(resolve, 50));
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

        <CoverPage sets={sets} settings={settings} count={catalogSets.length} />

        <IndexPage sets={catalogSets} settings={settings} />

        {catalogSets.map((set, idx) => (
          <SetPage
            key={set.id ?? idx}
            set={set}
            idx={idx}
            total={catalogSets.length}
            imageMap={imageMap}
            settings={settings}
          />
        ))}

      </div>
    </div>
  );
});

export default PdfTemplate;
