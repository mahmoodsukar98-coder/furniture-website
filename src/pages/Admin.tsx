import React, { useState, useEffect } from 'react';
import { db, storage, auth } from '../lib/firebase';
import { collection, addDoc, doc, setDoc, getDocs, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Plus, Check, Loader2, ArrowRight, LogIn, LogOut, UploadCloud, MessageCircle, Trash2, FolderUp, FileUp, Users, ShieldAlert, Settings as SettingsIcon, Save, ChevronUp, ChevronDown, Smartphone, ChevronRight, ChevronLeft, Mail } from 'lucide-react';
import { Link } from 'react-router-dom';
import { signInWithPopup, GoogleAuthProvider, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { handleFirestoreError, OperationType } from '../lib/firebaseErrors';
import { SiteSettings } from '../types';

import PdfTemplate, { PdfTemplateRef } from '../components/PdfTemplate';

export default function Admin() {
  const [editingId, setEditingId] = useState<string | null>(null);
  const pdfTemplateRef = React.useRef<PdfTemplateRef>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [desc, setDesc] = useState('');
  const [images, setImages] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setAuthLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogin = async () => {
    if (!auth) return;
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Login failed", error);
    }
  };

  const handleLogout = async () => {
    if (!auth) return;
    await signOut(auth);
  };

  const [dbSets, setDbSets] = useState<any[]>([]);

  const [admins, setAdmins] = useState<any[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({ whatsappNumbers: [], socialLinks: [] });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [bulkQueue, setBulkQueue] = useState<{id: string; name: string; files: File[]; status: 'pending' | 'uploading' | 'done' | 'error'; errorMsg?: string}[]>([]);
  const [isProcessingQueue, setIsProcessingQueue] = useState(false);
  
  const [pdfGenerationMsg, setPdfGenerationMsg] = useState<{type: 'success'|'error', text: string} | null>(null);

  const generateAndUploadPdf = async () => {
    try {
      setPdfGenerationMsg(null);
      setIsGeneratingPdf(true);
      if (!pdfTemplateRef.current) throw new Error("PDF Template not ready");
      
      const blobUrl = await pdfTemplateRef.current.generatePdf();
      if (!blobUrl) throw new Error("Failed to generate PDF");
      
      const response = await fetch(blobUrl);
      const blob = await response.blob();
      
      if (siteSettings?.catalogPdfUrl) {
         try {
           // We will try deleting the old file to save space
           const { deleteObject } = await import('firebase/storage');
           const oldRef = ref(storage, siteSettings.catalogPdfUrl);
           await deleteObject(oldRef);
         } catch(e) {
           console.log("Could not delete old PDF", e);
         }
      }

      const fileRef = ref(storage, `catalog/Sukar_Furniture_Catalog_${Date.now()}.pdf`);
      await uploadBytes(fileRef, blob, { contentType: 'application/pdf' });
      const url = await getDownloadURL(fileRef);
      
      await setDoc(doc(db, 'settings', 'general'), { ...siteSettings, catalogPdfUrl: url }, { merge: true });
      
      URL.revokeObjectURL(blobUrl);
      setPdfGenerationMsg({ type: 'success', text: 'تم تحديث الكتالوج (PDF) بنجاح! وسيكون متاحاً برابط جديد فوراً.' });
    } catch (err: any) {
      console.error(err);
      setPdfGenerationMsg({ type: 'error', text: 'حدث خطأ أثناء تحديث الـ PDF: ' + err.message });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  useEffect(() => {
    if (!db || !user) return;
    
    // Check if user is admin
    const ownerEmail = 'mahmoodsukar98@gmail.com';
    const qAdmins = collection(db, 'admins');
    const unsubscribeAdmins = onSnapshot(qAdmins, (snap) => {
       const adminsList = snap.docs.map(d => ({id: d.id, ...d.data()}));
       setAdmins(adminsList);
       setIsAdmin(user.email === ownerEmail || adminsList.some(a => a.id === user.email));
    });

    // Realtime listener for dbSets
    const qSets = collection(db, 'furniture_sets');
    const unsubscribeSets = onSnapshot(qSets, (snap) => {
       setDbSets(snap.docs.map(d => ({id: d.id, ...d.data()})));
    });



    // Realtime listener for settings
    const qSettings = doc(db, 'settings', 'general');
    const unsubscribeSettings = onSnapshot(qSettings, (snap) => {
      if (snap.exists()) {
        setSiteSettings(snap.data() as SiteSettings);
      }
    });

    return () => {
       unsubscribeAdmins();
       unsubscribeSets();
       unsubscribeSettings();
    };
  }, [db, user]);

  const handleFolderBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList || filesList.length === 0 || !db) return;
    
    setSuccess(false);
    
    try {
        const files = Array.from(filesList) as File[];
        const map = new Map<string, File[]>();
        
        for (const file of files) {
            // Allow images, videos, docx, and txt
            if (!file.type.startsWith('image/') && !file.type.startsWith('video/') && !file.name.endsWith('.docx') && !file.name.endsWith('.txt')) continue;
            
            const pathParts = file.webkitRelativePath.split('/');
            if (pathParts.length >= 2) {
                const setName = pathParts[pathParts.length - 2];
                if (!map.has(setName)) map.set(setName, []);
                map.get(setName)!.push(file);
            }
        }
        
        if (map.size === 0) {
            alert('لم يتم العثور على صور أو ملفات في المجلدات المحددة.');
            return;
        }

        const newItems = Array.from(map.entries()).map(([setName, setFiles], idx) => ({
            id: Date.now().toString() + idx,
            name: setName,
            files: setFiles,
            status: 'pending' as const
        }));

        setBulkQueue(prev => [...prev, ...newItems]);
    } catch(err) {
        console.error(err);
        alert('حدث خطأ أثناء قراءة المجلدات.');
    }
    e.target.value = '';
  }

  // Effect to process the queue automatically
  useEffect(() => {
    if (bulkQueue.length === 0 || isProcessingQueue) return;

    const processNext = async () => {
        const nextIndex = bulkQueue.findIndex(item => item.status === 'pending');
        if (nextIndex === -1) return; // All done or uploading

        setIsProcessingQueue(true);
        const item = bulkQueue[nextIndex];
        
        // Mark as uploading
        setBulkQueue(prev => prev.map((q, i) => i === nextIndex ? { ...q, status: 'uploading' } : q));

        try {
            const imageUrls: string[] = [];
            let extractedName: string = item.name;
            let extractedPrice: string = 'تواصل معنا';
            let extractedDesc: string[] = [];

            for (const file of item.files) {
                if (file.name.endsWith('.docx')) {
                    try {
                        const mammoth = (await import('mammoth')).default;
                        const arrayBuffer = await file.arrayBuffer();
                        const result = await mammoth.extractRawText({ arrayBuffer });
                        const text = result.value;
                        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                        if (lines.length > 0) {
                            extractedName = lines[0]; // First line is name
                            if (lines.length > 1) {
                                extractedPrice = lines[lines.length - 1]; // Last line is price
                                extractedDesc = lines.slice(1, lines.length - 1); // Middle lines are description
                            }
                        }
                    } catch (e) {
                         console.error('Error parsing docx', e);
                    }
                } else if (file.name.endsWith('.txt')) {
                    try {
                        const text = await file.text();
                        const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                        if (lines.length > 0) {
                            extractedName = lines[0]; // First line is name
                            if (lines.length > 1) {
                                extractedPrice = lines[lines.length - 1]; // Last line is price
                                extractedDesc = lines.slice(1, lines.length - 1); // Middle lines are description
                            }
                        }
                    } catch (e) {
                         console.error('Error parsing txt', e);
                    }
                }
            }

            // Check if duplicate set exists
            const duplicateExists = dbSets.some(s => s.name === extractedName);
            if (duplicateExists) {
                 setBulkQueue(prev => prev.map((q, i) => i === nextIndex ? { ...q, status: 'done' } : q));
                 setIsProcessingQueue(false);
                 return;
            }

            for (const file of item.files) {
                if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
                    const fileRef = ref(storage, `catalog/${Date.now()}_${file.name}`);
                    await uploadBytes(fileRef, file);
                    const url = await getDownloadURL(fileRef);
                    imageUrls.push(url);
                }
            }
            
            await addDoc(collection(db, 'furniture_sets'), {
                name: extractedName,
                price: extractedPrice,
                description: extractedDesc,
                images: imageUrls,
                videos: [],
                createdAt: Date.now()
            });

            // Mark as done
            setBulkQueue(prev => prev.map((q, i) => i === nextIndex ? { ...q, status: 'done' } : q));
        } catch (error) {
            console.error("Queue upload error:", error);
            // Mark as error
            setBulkQueue(prev => prev.map((q, i) => i === nextIndex ? { ...q, status: 'error', errorMsg: 'مرفوض: تأكد من نشر Rules' } : q));
        }

        setIsProcessingQueue(false);
    };

    processNext();
  }, [bulkQueue, isProcessingQueue, db]);

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!db) return;
    setSettingsLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), siteSettings);
      alert('تم حفظ الإعدادات بنجاح');
      setSuccess(true);
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء حفظ الإعدادات');
    }
    setSettingsLoading(false);
  }

  const moveImage = async (setId: string, images: string[], index: number, direction: 'up' | 'down') => {
    const newImages = [...images];
    if (direction === 'up' && index > 0) {
       [newImages[index - 1], newImages[index]] = [newImages[index], newImages[index - 1]];
    } else if (direction === 'down' && index < newImages.length - 1) {
       [newImages[index], newImages[index + 1]] = [newImages[index + 1], newImages[index]];
    } else return;
    
    try {
      await updateDoc(doc(db, 'furniture_sets', setId), { images: newImages });
      setTimeout(() => {
        generateAndUploadPdf().catch(e => console.log(e));
      }, 2000);
    } catch(e) {
      alert("حدث خطأ أثناء ترتيب الصورة");
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccess(false);

    if (!db || !storage) {
      alert('لم يتم تهيئة Firebase بعد. الرجاء إعداد قاعدة البيانات أولاً.');
      setLoading(false);
      return;
    }

    try {
      const imageUrls: string[] = [...existingImages];

      if (images) {
        for (let i = 0; i < images.length; i++) {
          const file = images[i];
          const fileRef = ref(storage, `catalog/${Date.now()}_${file.name}`);
          await uploadBytes(fileRef, file);
          const url = await getDownloadURL(fileRef);
          imageUrls.push(url);
        }
      }

      const descriptionArray = desc.split('\n').filter(l => l.trim() !== '');

      if (editingId) {
        await updateDoc(doc(db, 'furniture_sets', editingId), {
          name,
          price,
          description: descriptionArray,
          images: imageUrls,
          updatedAt: Date.now()
        });
        setEditingId(null);
        setExistingImages([]);
      } else {
        await addDoc(collection(db, 'furniture_sets'), {
          name,
          price,
          description: descriptionArray,
          images: imageUrls,
          videos: [],
          createdAt: Date.now()
        });
      }

      setName('');
      setPrice('');
      setDesc('');
      setImages(null);
      setSuccess(true);
      
      // Auto regenerate PDF after a short delay so the Snapshot updates
      setTimeout(() => {
        generateAndUploadPdf().catch(err => console.log("Auto PDF gen failed", err));
      }, 2000);
    } catch (err) {
      console.error("Error saving document: ", err);
      if (err instanceof Error && err.message.includes('missing or insufficient permissions')) {
        alert("حدث خطأ أثناء حفظ الطقم: ليس لديك صلاحية الإدارة.");
      } else {
        alert("حدث خطأ أثناء حفظ الطقم.");
      }
      handleFirestoreError(err, editingId ? OperationType.UPDATE : OperationType.CREATE, 'furniture_sets');
    }
    setLoading(false);
  };

  if (!db) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center p-6 direction-rtl" dir="rtl">
        <div className="bg-dark-2 p-8 rounded-2xl max-w-lg w-full text-center border border-gold/20 shadow-2xl">
          <div className="text-gold mb-4 flex justify-center"><Loader2 size={48} className="animate-spin" /></div>
          <h2 className="text-xl font-bold text-white mb-2">قاعدة البيانات غير متصلة</h2>
          <p className="text-text-dim text-sm">التطبيق لم يرتبط بـ Firebase حتى الآن. المرجو استكمال إعدادات Firebase.</p>
        </div>
      </div>
    );
  }

  if (authLoading) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center p-6 direction-rtl" dir="rtl">
        <Loader2 size={48} className="animate-spin text-gold" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center p-6 direction-rtl" dir="rtl">
        <div className="bg-dark-2 p-8 rounded-2xl max-w-lg w-full text-center border border-gold/20 shadow-2xl">
          <h2 className="text-2xl font-black text-white mb-6">تسجيل الدخول للإدارة</h2>
          <p className="text-text-dim text-sm mb-6">لا يمكن إضافة صور أو تعديل الكتالوج إلا للمسؤولين فقط.</p>
          <button onClick={handleLogin} className="bg-white text-navy font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 mx-auto hover:bg-gray-200 transition-all shadow-[0_4px_20px_rgba(255,255,255,0.1)]">
            <LogIn size={20} /> تسجيل الدخول بواسطة جوجل
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-navy flex items-center justify-center p-6 direction-rtl" dir="rtl">
        <div className="bg-dark-2 p-8 rounded-2xl max-w-lg w-full text-center border border-red-500/20 shadow-2xl">
          <div className="text-red-500 mb-4 flex justify-center"><ShieldAlert size={48} /></div>
          <h2 className="text-xl font-bold text-white mb-2">عفواً، لا تملك صلاحية الإدارة</h2>
          <p className="text-text-dim text-sm mb-6">حسابك الحالي ({user.email}) ليس مسجلاً كمسؤول.</p>
          <button onClick={handleLogout} className="bg-white/10 text-white font-bold py-3 px-6 rounded-xl flex items-center justify-center gap-2 mx-auto hover:bg-white/20 transition-all">
            <LogOut size={20} /> تسجيل الخروج
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-navy text-text-main direction-rtl p-4 md:p-8" dir="rtl">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-2xl font-black text-white">إضافة طقم جديد للكتالوج</h1>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4">
            <div className="text-xs text-text-dim bg-dark-3 px-3 py-1.5 rounded-lg border border-white/5 truncate max-w-[150px] sm:max-w-none shadow-sm">
              {user.email}
            </div>
            <button onClick={handleLogout} className="flex items-center gap-1.5 text-xs font-bold text-red-400 hover:text-red-300 bg-red-400/10 hover:bg-red-400/20 px-3 py-1.5 rounded-lg border border-red-400/20 transition-all">
               <LogOut size={14} /> تسجيل خروج
            </button>
            <Link to="/" className="flex items-center gap-2 text-sm font-bold text-gold hover:text-gold-l bg-gold/10 px-4 py-2 rounded-xl border border-gold/20 ml-2">
              العودة للكتالوج <ArrowRight size={16} />
            </Link>
          </div>
        </div>

        <div className="bg-dark-2 p-6 md:p-8 rounded-[28px] border border-gold/20 shadow-2xl relative overflow-hidden mb-8">
          <div className="flex items-center justify-between mb-4">
             <h2 className="text-xl font-bold text-white flex items-center gap-2"><FolderUp size={24} className="text-gold"/> الرفع التلقائي للمجلدات</h2>
          </div>
          <p className="text-sm text-text-dim mb-4 leading-relaxed">
            يمكنك رفع مجلد رئيسي (مثال: "أطقم 2026") والذي يحتوي بداخله على عدة مجلدات فرعية (مثال: مجلد "ركنة لين"، ومجلد "ركنة كارميل"، إلخ). سيتم قراءة كل مجلد فرعي كطقم مستقل ورفع الصور التي بداخله تلقائياً لتوفير الوقت.
          </p>
          <label className="w-full bg-navy/80 hover:bg-navy border border-gold/30 text-gold font-bold py-3 px-6 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer relative mb-4">
            <input 
               type="file" 
               multiple 
               {...{webkitdirectory: "true", directory: "true"} as any}
               onChange={handleFolderBulkUpload} 
               className="hidden" 
               disabled={isProcessingQueue}
            />
            {isProcessingQueue ? <><Loader2 size={18} className="animate-spin" /> جاري معالجة ورفع الأطقم...</> : <><UploadCloud size={18} /> اختر مجلد رئيسي (يحتوي على أطقم)</>}
          </label>

          {bulkQueue.length > 0 && (
            <div className="bg-dark-3 border border-white/5 rounded-xl p-4 mt-6 max-h-64 overflow-y-auto custom-scrollbar">
              <h3 className="text-white font-bold text-sm mb-3">قائمة الرفع ({bulkQueue.filter(q => q.status === 'done').length}/{bulkQueue.length})</h3>
              <div className="space-y-2">
                {bulkQueue.map((item) => (
                  <div key={item.id} className="bg-white/5 border border-white/5 rounded-lg p-3 flex items-center justify-between">
                    <div>
                      <div className="text-white font-bold text-sm">{item.name}</div>
                      <div className="text-text-dim text-xs">{item.files.length} صورة</div>
                    </div>
                    <div>
                      {item.status === 'pending' && <span className="text-gray-400 text-xs font-bold bg-gray-500/10 px-2 py-1 rounded">في الانتظار</span>}
                      {item.status === 'uploading' && <span className="text-gold text-xs font-bold flex items-center gap-1 bg-gold/10 px-2 py-1 rounded"><Loader2 size={12} className="animate-spin"/> جاري الرفع</span>}
                      {item.status === 'done' && <span className="text-green-500 text-xs font-bold flex items-center gap-1 bg-green-500/10 px-2 py-1 rounded"><Check size={12}/> تم</span>}
                      {item.status === 'error' && <span className="text-red-500 text-xs font-bold bg-red-500/10 px-2 py-1 rounded">{item.errorMsg}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>



        <div className="bg-dark-2 p-6 md:p-8 rounded-[28px] border border-gold/20 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full filter blur-3xl -z-10" />
          
          <form onSubmit={handleSubmit} className="space-y-5 relative z-10">
            <div>
              <label className="block text-sm font-bold text-text-dim mb-2 drop-shadow-md">اسم الطقم</label>
              <input
                type="text"
                required
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-dark-3/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold outline-none transition-all placeholder:text-dark-4"
                placeholder="مثال: طقم جلوس إيطالي 2026"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-text-dim mb-2 drop-shadow-md">السعر (جنيه مصري)</label>
              <input
                type="text"
                value={price}
                onChange={e => setPrice(e.target.value)}
                className="w-full bg-dark-3/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold outline-none transition-all placeholder:text-dark-4"
                placeholder="مثال: 55,000"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-text-dim mb-2 drop-shadow-md">المواصفات (كل سطر مواصفة منفصلة)</label>
              <textarea
                rows={4}
                value={desc}
                onChange={e => setDesc(e.target.value)}
                className="w-full bg-dark-3/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold outline-none transition-all placeholder:text-dark-4 resize-none leading-relaxed"
                placeholder="خشب زان أحمر روماني
قماش قطيفة مستورد
سفنج كثافة 33"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-text-dim mb-2 drop-shadow-md">صور الطقم</label>
              <div className="flex flex-col sm:flex-row gap-4">
                <label className="flex-1 cursor-pointer bg-dark-3 hover:bg-dark-4 border border-white/10 border-dashed rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all">
                  <FileUp size={24} className="text-gold" />
                  <span className="text-sm font-bold text-white">اختر ملفات (صور)</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={e => setImages(e.target.files)}
                    className="hidden"
                  />
                </label>
              </div>
              {existingImages.length > 0 && (
                <div className="mt-3 text-sm text-white font-bold bg-white/5 p-4 rounded-lg border border-white/10">
                  <div className="mb-2">صور محفوظة ({existingImages.length}):</div>
                  <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                     {existingImages.map((src, i) => (
                        <div key={src} className="relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-white/10 group">
                           <img src={src} className="w-full h-full object-cover" />
                           <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <button
                                 type="button"
                                 onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    if(window.confirm('هل أنت متأكد من إزالة هذه الصورة؟')) {
                                       setExistingImages(prev => prev.filter((_, idx) => idx !== i));
                                    }
                                 }}
                                 className="text-red-400 hover:text-red-300 bg-red-500/20 p-1.5 rounded-lg backdrop-blur-sm relative z-50 cursor-pointer"
                              >
                                 <Trash2 size={14} />
                              </button>
                           </div>
                        </div>
                     ))}
                  </div>
                </div>
              )}
              {images && images.length > 0 && (
                <div className="mt-3 text-sm text-gold font-bold bg-gold/5 p-4 rounded-lg border border-gold/10">
                  <div className="mb-2">صور جديدة ({images.length}):</div>
                  <div className="flex gap-2 overflow-x-auto custom-scrollbar pb-2">
                     {Array.from(images as FileList).map((file: File, i) => (
                        <div key={i} className="w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-gold/30">
                           <img src={URL.createObjectURL(file)} className="w-full h-full object-cover" />
                        </div>
                     ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-4 flex gap-2 w-full">
              <button
                type="submit"
                disabled={loading}
                className="flex-1 bg-gradient-to-l from-gold to-gold-l text-white font-extrabold py-3.5 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_4px_20px_rgba(200,149,42,0.3)] border border-gold-l/50"
              >
                {loading ? <><Loader2 size={20} className="animate-spin" /> جاري الرفع والحفظ...</> : <><Plus size={20} /> {editingId ? 'تحديث الطقم' : 'إضافة الطقم للكتالوج'}</>}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={() => {
                     setEditingId(null);
                     setName('');
                     setPrice('');
                     setDesc('');
                     setImages(null);
                     setExistingImages([]);
                  }}
                  className="px-6 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-bold rounded-xl transition-all border border-red-500/20"
                >
                  إلغاء التعديل
                </button>
              )}
            </div>

            {success && (
              <div className="flex items-center gap-3 text-green-400 bg-green-500/10 p-4 rounded-xl border border-green-500/20 font-bold mt-4 animate-in fade-in slide-in-from-bottom-2">
                <div className="bg-green-500/20 p-1 rounded-full"><Check size={16} /></div> 
                تم العمل بنجاح!
              </div>
            )}
          </form>
        </div>

        <div className="bg-dark-2 p-6 md:p-8 rounded-[28px] border border-gold/20 shadow-2xl relative overflow-hidden mt-8 mb-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><SettingsIcon size={24} className="text-gold"/> إعدادات الموقع</h2>
          <form border="0" className="space-y-6" onSubmit={handleUpdateSettings}>
            {/* WhatsApp Numbers */}
            <div>
              <h3 className="font-bold text-white mb-3 flex items-center gap-2"><Smartphone size={18} className="text-gold"/> أرقام الواتساب للتواصل</h3>
              {siteSettings.whatsappNumbers?.map((num, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={num.label}
                    placeholder="الاسم (مثال: الفرع الرئيسي)"
                    onChange={e => {
                      const newNums = [...(siteSettings.whatsappNumbers || [])];
                      newNums[idx].label = e.target.value;
                      setSiteSettings({ ...siteSettings, whatsappNumbers: newNums });
                    }}
                    className="flex-1 bg-dark-3/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold outline-none"
                  />
                  <input
                    type="text"
                    value={num.number}
                    placeholder="الرقم (مثال: 201090902911)"
                    onChange={e => {
                      const newNums = [...(siteSettings.whatsappNumbers || [])];
                      newNums[idx].number = e.target.value;
                      setSiteSettings({ ...siteSettings, whatsappNumbers: newNums });
                    }}
                    className="flex-1 bg-dark-3/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-sans dir-ltr focus:border-gold outline-none"
                  />
                  <button type="button" onClick={() => {
                    const newNums = [...(siteSettings.whatsappNumbers || [])];
                    newNums.splice(idx, 1);
                    setSiteSettings({ ...siteSettings, whatsappNumbers: newNums });
                  }} className="bg-red-500/20 text-red-400 px-4 py-2.5 rounded-xl hover:bg-red-500/30">حذف</button>
                </div>
              ))}
              <button type="button" onClick={() => {
                 setSiteSettings({ ...siteSettings, whatsappNumbers: [...(siteSettings.whatsappNumbers || []), {label: '', number: ''}] });
              }} className="text-sm font-bold text-gold hover:text-white mt-1 mb-4">+ إضافة رقم واتساب جديد</button>
            </div>

            {/* Email Contact */}
            <div className="pt-4 border-t border-white/10 mb-4">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2"><Mail size={18} className="text-gold"/> البريد الإلكتروني للتواصل</h3>
              <input
                type="email"
                value={siteSettings.contactEmail || ''}
                placeholder="info@bukarfurniture.com"
                onChange={e => setSiteSettings({ ...siteSettings, contactEmail: e.target.value })}
                className="w-full bg-dark-3/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-sans dir-ltr focus:border-gold outline-none"
              />
            </div>

            {/* Social Links */}
            <div className="pt-4 border-t border-white/10">
              <h3 className="font-bold text-white mb-3 flex items-center gap-2"><MessageCircle size={18} className="text-gold"/> روابط التواصل الاجتماعي</h3>
              {siteSettings.socialLinks?.map((link, idx) => (
                <div key={idx} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={link.platform}
                    placeholder="المنصة (مثال: فيسبوك، انستجرام)"
                    onChange={e => {
                       const newLinks = [...(siteSettings.socialLinks || [])];
                       newLinks[idx].platform = e.target.value;
                       setSiteSettings({ ...siteSettings, socialLinks: newLinks });
                    }}
                    className="w-1/3 bg-dark-3/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm focus:border-gold outline-none"
                  />
                  <input
                    type="text"
                    value={link.url}
                    placeholder="الرابط البادئ بـ http"
                    onChange={e => {
                       const newLinks = [...(siteSettings.socialLinks || [])];
                       newLinks[idx].url = e.target.value;
                       setSiteSettings({ ...siteSettings, socialLinks: newLinks });
                    }}
                    className="flex-1 bg-dark-3/50 border border-white/10 rounded-xl px-4 py-2.5 text-sm font-sans dir-ltr focus:border-gold outline-none"
                  />
                  <button type="button" onClick={() => {
                    const newLinks = [...(siteSettings.socialLinks || [])];
                    newLinks.splice(idx, 1);
                    setSiteSettings({ ...siteSettings, socialLinks: newLinks });
                  }} className="bg-red-500/20 text-red-400 px-4 py-2.5 rounded-xl hover:bg-red-500/30">حذف</button>
                </div>
              ))}
              <button type="button" onClick={() => {
                 setSiteSettings({ ...siteSettings, socialLinks: [...(siteSettings.socialLinks || []), {platform: '', url: ''}] });
              }} className="text-sm font-bold text-gold hover:text-white mt-1">+ إضافة رابط جديد</button>
            </div>

            <div>
              <button disabled={settingsLoading} type="submit" className="bg-gold hover:bg-gold-l text-navy font-bold px-6 py-3 rounded-xl transition-all flex items-center justify-center gap-2 mt-4">
                {settingsLoading ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} حفظ الإعدادات
              </button>
            </div>
          </form>
        </div>

        <div className="bg-dark-2 p-6 md:p-8 rounded-[28px] border border-gold/20 shadow-2xl relative overflow-hidden mt-8 mb-8">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2"><Users size={24} className="text-gold"/> إدارة المشرفين (الأدمن)</h2>
          
          <div className="flex gap-2 mb-6">
            <input 
              type="email" 
              placeholder="أدخل ايميل المشرف الجديد..." 
              value={newAdminEmail}
              onChange={e => setNewAdminEmail(e.target.value)}
              className="flex-1 bg-dark-3/50 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-gold outline-none transition-all placeholder:text-dark-4"
            />
            <button 
              onClick={async () => {
                 if(!newAdminEmail || !newAdminEmail.includes('@')) return alert('ايميل غير صالح');
                 try {
                   await setDoc(doc(db, 'admins', newAdminEmail.toLowerCase()), { addedAt: Date.now() });
                   setNewAdminEmail('');
                   alert('تم إضافة المشرف بنجاح');
                 } catch(e) {
                   console.error(e);
                   alert('حدث خطأ');
                 }
              }}
              className="bg-gold hover:bg-gold-l text-navy font-bold px-6 py-3 rounded-xl transition-all"
            >
              إضافة
            </button>
          </div>

          <div className="space-y-3">
             <div className="bg-dark-4 border border-gold/30 rounded-xl p-4 flex justify-between items-center">
                <span className="text-white font-bold">mahmoodsukar98@gmail.com</span>
                <span className="bg-gold/20 text-gold text-xs px-3 py-1 rounded-full">المالك الأساسي</span>
             </div>
             {admins.map(admin => (
               <div key={admin.id} className="bg-dark-3 border border-white/10 rounded-xl p-4 flex justify-between items-center">
                 <span className="text-white">{admin.id}</span>
                 <button 
                   onClick={async () => {
                       try {
                         await deleteDoc(doc(db, 'admins', admin.id));
                       } catch(e) { console.error(e) }
                   }}
                   className="text-red-400 hover:bg-red-400/10 px-3 py-1 rounded-lg text-sm font-bold transition-all"
                 >
                   إزالة
                 </button>
               </div>
             ))}
          </div>
        </div>

        <div className="bg-dark-2 p-6 md:p-8 rounded-[28px] border border-gold/20 shadow-2xl relative overflow-hidden mt-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <h2 className="text-xl font-bold text-white">تعديل الأطقم الحالية ({dbSets.length})</h2>
            <div className="flex flex-col items-end gap-2">
              <button 
                onClick={generateAndUploadPdf}
                disabled={isGeneratingPdf || dbSets.length === 0}
                className="bg-gold/20 text-gold hover:bg-gold/30 border border-gold/30 font-bold px-4 py-2 rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isGeneratingPdf ? <Loader2 size={18} className="animate-spin" /> : <FileUp size={18} />} إضافة/تحديث الـ PDF
              </button>
              {pdfGenerationMsg && (
                <div className={`text-xs font-bold px-3 py-1.5 rounded-lg ${pdfGenerationMsg.type === 'success' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                  {pdfGenerationMsg.text}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-4">
            {dbSets.map((set) => (
              <div key={set.id} className="relative bg-dark-3 border border-white/10 rounded-3xl p-5 md:p-6 flex flex-col gap-5 overflow-hidden shadow-lg transition-all hover:border-gold/30">
                
                {/* Header Section */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 z-10">
                  <div className="flex-1">
                    <h3 className="font-bold text-white text-xl flex items-center gap-3 mb-1">
                      {set.name}
                      {set.isHidden && <span className="text-xs bg-red-500/20 text-red-400 px-2.5 py-1 rounded-full font-bold">محجوب</span>}
                    </h3>
                    <p className="text-gold text-lg font-black">{set.price}</p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 shrink-0">
                    <button 
                      onClick={async () => {
                         try {
                           await updateDoc(doc(db, 'furniture_sets', set.id), { isHidden: !set.isHidden });
                           setSuccess(s => !s);
                           setTimeout(() => {
                             generateAndUploadPdf().catch(e=>console.log(e));
                           }, 2000);
                         } catch (e) {
                           alert('حدث خطأ');
                         }
                      }}
                      className={set.isHidden ? "bg-green-500/20 text-green-400 hover:bg-green-500/30 px-4 py-2 rounded-xl font-bold text-sm transition-all" : "bg-gray-500/20 text-gray-300 hover:bg-gray-500/30 px-4 py-2 rounded-xl font-bold text-sm transition-all"}
                    >
                      {set.isHidden ? 'إظهار بالموقع' : 'حجب'}
                    </button>
                    <button 
                      onClick={() => {
                        setEditingId(set.id);
                        setName(set.name);
                        setPrice(set.price);
                        setDesc(set.description?.join('\n') || '');
                        setExistingImages(set.images || []);
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                      }}
                      className="bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 px-4 py-2 rounded-xl font-bold text-sm transition-all"
                    >
                      تعديل متقدم
                    </button>
                    <button 
                      onClick={async () => {
                               try {
                                 await deleteDoc(doc(db, 'furniture_sets', set.id));
                                 setSuccess(s => !s);
                                 setTimeout(() => {
                                   generateAndUploadPdf().catch(e=>console.log(e));
                                 }, 2000);
                               } catch (e) {
                                 alert('حدث خطأ أثناء الحذف، تحقق من الصلاحيات.');
                               }
                      }}
                      className="bg-red-500/20 text-red-400 hover:bg-red-500/30 px-4 py-2 rounded-xl font-bold text-sm transition-all"
                    >
                      حذف
                    </button>
                  </div>
                </div>

                {/* Main Image Section */}
                {set.images?.length > 0 ? (
                  <div className="w-full h-56 sm:h-72 md:h-96 rounded-2xl bg-dark-4 border border-white/5 overflow-hidden flex items-center justify-center p-2">
                    <img src={set.images[0]} alt={set.name} className="max-w-full max-h-full object-contain drop-shadow-2xl" />
                  </div>
                ) : (
                  <div className="w-full h-56 sm:h-72 md:h-96 rounded-2xl bg-dark-4 border border-white/5 flex items-center justify-center text-sm text-text-dim">
                    لا توجد صورة
                  </div>
                )}

                {/* Thumbnails Section */}
                {set.images?.length > 1 && (
                  <div className="flex gap-3 overflow-x-auto pb-2 pt-1 custom-scrollbar w-full">
                    {set.images.map((img: string, i: number) => (
                      <div key={img} className="relative group shrink-0 w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-dark-4 border border-white/10 overflow-hidden snap-start transition-all hover:border-gold/50 cursor-pointer">
                        <img src={img} alt="" className="w-full h-full object-contain p-1.5" />
                        <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-all duration-300">
                           <div className="flex items-center gap-2 translate-y-2 group-hover:translate-y-0 transition-all duration-300">
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveImage(set.id, set.images, i, 'up'); }} disabled={i === 0} className="text-white hover:text-gold bg-white/10 hover:bg-white/20 disabled:opacity-30 p-2 backdrop-blur-md rounded-xl transition-all shadow-lg relative z-50 cursor-pointer"><ChevronRight size={16} /></button>
                            <button onClick={async (e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  if (window.confirm('هل أنت متأكد من حذف هذه الصورة نهائيّاً من الطقم؟')) {
                                    const newImages = set.images.filter((_, index) => index !== i);
                                    try {
                                      await updateDoc(doc(db, 'furniture_sets', set.id), { images: newImages });
                                      setTimeout(() => {
                                        generateAndUploadPdf().catch(e => console.log(e));
                                      }, 2000);
                                    } catch (err) {
                                      alert('حدث خطأ');
                                    }
                                  }
                            }} className="text-red-400 hover:text-red-300 bg-red-500/20 hover:bg-red-500/40 p-2 backdrop-blur-md rounded-xl transition-all shadow-lg relative z-50 cursor-pointer"><Trash2 size={16} /></button>
                            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); moveImage(set.id, set.images, i, 'down'); }} disabled={i === set.images.length - 1} className="text-white hover:text-gold bg-white/10 hover:bg-white/20 disabled:opacity-30 p-2 backdrop-blur-md rounded-xl transition-all shadow-lg relative z-50 cursor-pointer"><ChevronLeft size={16} /></button>
                           </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {dbSets.length === 0 && <p className="text-text-dim text-center">لا توجد أطقم حالياً</p>}
          </div>
        </div>
        <PdfTemplate 
          ref={pdfTemplateRef}
          sets={dbSets} 
          settings={siteSettings} 
        />
      </div>
    </div>
  );
}
