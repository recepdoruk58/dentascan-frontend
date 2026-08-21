import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Activity,
  CalendarClock,
  CheckCircle2,
  FileImage,
  Loader2,
  ScanLine,
  Trash2,
  UploadCloud,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DentaScan — Diş Çürüğü Tespit Sistemi" },
      { name: "description", content: "Panoramik diş röntgenlerini yükleyin, çürük bölgeleri otomatik işaretlensin ve geçmiş analizlerinizi tek ekrandan takip edin." },
    ],
  }),
  component: Index,
});

// SUNUCU BİLGİLERİ 
const API_URL = "http://127.0.0.1:8000";
const API_KEY = import.meta.env['VITE_API_KEY']; 

// Backend den gelen YOLO koordinat yapısı
type BackendDetection = {
  class_id: number;
  confidence: number;
  box: { xmin: number; ymin: number; xmax: number; ymax: number };
};

// Frontend in ekrana çizmek için beklediği yüzdelik yapı
type Finding = {
  id: string;
  label: string;
  confidence: number;
  x: number;
  y: number;
  w: number;
  h: number;
};

type Analysis = {
  id: string;
  fileName: string;
  imageUrl: string;
  createdAt: string;
  findings: Finding[];
  rawDetections?: BackendDetection[]; // Geçmişten gelen ham verileri tutmak için
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString("tr-TR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function severity(c: number) {
  if (c >= 0.70) return { text: "Yüksek", cls: "bg-danger/10 text-danger" };
  if (c >= 0.45) return { text: "Orta", cls: "bg-warning/15 text-warning" };
  return { text: "Düşük", cls: "bg-success/10 text-success" };
}

// YOLO Piksellerini css Yüzdelerine Çeviren Fonksiyon
function calculateFindings(detections: BackendDetection[], imgW: number, imgH: number): Finding[] {
  return detections.map((det, i) => {
    const { xmin, ymin, xmax, ymax } = det.box;
    return {
      id: `det-${i}`,
      label: "Çürük", // Model sadece çürük tespit ettiği için sabit
      confidence: det.confidence,
      x: (xmin / imgW) * 100,
      y: (ymin / imgH) * 100,
      w: ((xmax - xmin) / imgW) * 100,
      h: ((ymax - ymin) / imgH) * 100,
    };
  });
}

function Index() {
  const [history, setHistory] = useState<Analysis[]>([]);
  const [active, setActive] = useState<Analysis | null>(null);
  const [dragging, setDragging] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sayfa açıldığında geçmişi veritabanından çekiyoruz
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${API_URL}/history`, {
          headers: { "X-API-Key": API_KEY }
        });
        const data = await res.json();
        if (data.status === "success") {
          const loadedHistory = data.history.map((item: any) => ({
            id: item.id.toString(),
            fileName: item.file_path.split('/').pop(),
            imageUrl: `${API_URL}/${item.file_path}`,
            createdAt: item.date_created,
            rawDetections: item.detections,
            findings: [] 
          }));
          setHistory(loadedHistory);
        }
      } catch (error) {
        console.error("Geçmiş çekilirken hata oluştu:", error);
      }
    };
    fetchHistory();
  }, []);

  // Yeni röntgen yükleme ve yapay zeka isteği bu kısımda bulunuyor
  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) return;
    
    const url = URL.createObjectURL(file);
    setAnalyzing(true);
    setActive({
      id: "pending", fileName: file.name, imageUrl: url,
      createdAt: new Date().toISOString(), findings: [],
    });

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await fetch(`${API_URL}/predict_caries`, {
        method: "POST",
        headers: { "X-API-Key": API_KEY },
        body: formData
      });

      if (!response.ok) throw new Error("API Hatası");
      const data = await response.json();

      // Yüzdelik koordinat hesabı için resmin orijinal boyutunu alıyoruz
      const img = new window.Image();
      img.src = url;
      await new Promise((resolve) => (img.onload = resolve));

      const findings = calculateFindings(data.detections, img.width, img.height);
      
      const newAnalysis: Analysis = {
        id: data.file_path,
        fileName: file.name,
        imageUrl: `${API_URL}/${data.file_path}`,
        createdAt: new Date().toISOString(),
        findings: findings,
        rawDetections: data.detections
      };

      setActive(newAnalysis);
      setHistory((prev) => [newAnalysis, ...prev]);

    } catch (error) {
      console.error(error);
      alert("Analiz başarısız. Lütfen FastAPI sunucusunun çalıştığından emin olun.");
    } finally {
      setAnalyzing(false);
    }
  }, []);

  // Geçmişten bir röntgene tıkladığımızda çizim yapma kısmı
  const selectHistoryItem = async (item: Analysis) => {
    setActive({ ...item, findings: [] }); 
    setAnalyzing(true);

    const img = new window.Image();
    img.src = item.imageUrl;
    await new Promise((resolve) => (img.onload = resolve));

    const findings = calculateFindings(item.rawDetections || [], img.width, img.height);
    setActive({ ...item, findings });
    setAnalyzing(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card/80 backdrop-blur">
        <div className="mx-auto grid max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-5 py-4 sm:flex sm:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="gradient-clinic grid h-10 w-10 shrink-0 place-items-center rounded-xl text-primary-foreground">
              <ScanLine className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold">DentaScan</h1>
              <p className="truncate text-xs text-muted-foreground">Diş Çürüğü Tespit Sistemi</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Model aktif
          </span>
        </div>
      </header>

      <main className="mx-auto grid max-w-7xl gap-6 px-5 py-8 lg:grid-cols-[320px_minmax(0,1fr)]">
        {/* Geçmiş analizler */}
        <aside className="panel h-fit p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold">Geçmiş Analizler</h2>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-secondary-foreground">
              {history.length}
            </span>
          </div>

          {history.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
              Henüz analiz yok. İlk röntgeni yükleyin.
            </p>
          ) : (
            <ul className="space-y-2">
              {history.map((h) => {
                const selected = active?.id === h.id;
                const findingCount = h.rawDetections ? h.rawDetections.length : h.findings.length;
                
                return (
                  <li key={h.id}>
                    <button
                      onClick={() => selectHistoryItem(h)}
                      className={`group w-full rounded-xl border px-3 py-3 text-left transition-colors ${
                        selected ? "border-primary/40 bg-primary/5" : "border-border hover:bg-secondary"
                      }`}
                    >
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CalendarClock className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{formatDate(h.createdAt)}</span>
                      </div>
                      <p className="mt-1 truncate text-sm font-semibold">
                        {findingCount} çürük tespit edildi
                      </p>
                      <p className="truncate text-xs text-muted-foreground">{h.fileName}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          {history.length > 0 && (
            <button
              onClick={() => { setHistory([]); setActive(null); }}
              className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary"
            >
              <Trash2 className="h-3.5 w-3.5" /> Listeyi temizle
            </button>
          )}
        </aside>

        {/* Yükleme + sonuç */}
        <section className="space-y-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) handleFile(file);
            }}
            onClick={() => inputRef.current?.click()}
            className={`panel flex cursor-pointer flex-col items-center justify-center gap-3 border-2 border-dashed px-6 py-12 text-center transition-colors ${
              dragging ? "border-primary bg-primary/5" : "border-border"
            }`}
          >
            <div className="gradient-clinic grid h-14 w-14 place-items-center rounded-2xl text-primary-foreground">
              <UploadCloud className="h-7 w-7" />
            </div>
            <div>
              <p className="font-display text-base font-bold">
                Panoramik röntgeni sürükleyip bırakın
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                veya dosya seçmek için tıklayın · PNG, JPG (maks. 20 MB)
              </p>
            </div>
            <input
              ref={inputRef} type="file" accept="image/*" className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                e.target.value = "";
              }}
            />
          </div>

          {active && (
            <div className="panel overflow-hidden">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-border px-5 py-4 sm:flex sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <FileImage className="h-5 w-5 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{active.fileName}</p>
                    <p className="truncate text-xs text-muted-foreground">{formatDate(active.createdAt)}</p>
                  </div>
                </div>
                {analyzing ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Analiz ediliyor
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full bg-success/10 px-3 py-1.5 text-xs font-medium text-success">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Analiz tamamlandı
                  </span>
                )}
              </div>

              <div className="grid gap-5 p-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
                
                
                <div className="overflow-hidden rounded-xl bg-foreground/95 self-start h-fit">
                  
                  <div className="relative w-full h-max">
                    <img
                      src={active.imageUrl}
                      alt={`${active.fileName} panoramik diş röntgeni analiz görüntüsü`}
                      className="block w-full h-auto"
                    />
                    {analyzing && (
                      <div className="absolute inset-0 grid place-items-center bg-foreground/40">
                        <Loader2 className="h-8 w-8 animate-spin text-primary-foreground" />
                      </div>
                    )}
                    {!analyzing &&
                      active.findings.map((f) => (
                        <div
                          key={f.id}
                          className="absolute rounded-sm border-2 border-danger"
                          style={{
                            left: `${f.x}%`, top: `${f.y}%`, width: `${f.w}%`, height: `${f.h}%`,
                          }}
                        >
                          <span className="absolute -top-5 left-0 whitespace-nowrap rounded bg-danger px-1.5 py-0.5 text-[10px] font-semibold text-destructive-foreground">
                            {f.label} · %{Math.round(f.confidence * 100)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
                

                <div>
                  <div className="mb-3 flex items-center gap-2">
                    <Activity className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold">Bulgular</h3>
                  </div>
                  {analyzing ? (
                    <div className="space-y-2">
                      {[0, 1, 2].map((i) => (
                        <div key={i} className="h-14 animate-pulse rounded-xl bg-muted" />
                      ))}
                    </div>
                  ) : (
                    <ul className="space-y-2">
                      {active.findings.map((f, i) => {
                        const s = severity(f.confidence);
                        return (
                          <li
                            key={f.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2.5"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold">
                                #{i + 1} · {f.label} Tespiti
                              </p>
                              <p className="text-xs text-muted-foreground">
                                Güven Skoru: %{Math.round(f.confidence * 100)}
                              </p>
                            </div>
                            <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${s.cls}`}>
                              {s.text}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}