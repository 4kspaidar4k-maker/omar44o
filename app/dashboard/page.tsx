"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  ShoppingCart,
  Layers,
  Calendar,
  ChevronLeft,
  Search,
  BookOpen,
} from "lucide-react";
import { useCart } from "../../context/CartContext";
import { supabase } from "@/lib/supabase";

export interface DossierItem {
  id: string | number;
  title: string;
  subject?: string;
  year?: string | number;
  semester?: string;
  dossier_type?: string;
  category?: string;
  price: number;
  image?: string;
}

const SEMESTERS = [
  { label: "الفصل الأول", value: "الأول" },
  { label: "الفصل الثاني", value: "الثاني" },
];

const DOSSIER_TYPES = ["مادة", "مكثف", "بنك أسئلة"];

const SUBJECTS_2010 = [
  "الرياضيات",
  "اللغة العربية",
  "التربية الإسلامية",
  "تاريخ الأردن",
];

const SUBJECTS_2009 = [
  "الرياضيات",
  "اللغة العربية",
  "اللغة الإنجليزية",
  "التربية الإسلامية",
  "تاريخ الأردن",
  "الكيمياء",
  "الفيزياء",
  "الأحياء",
  "علوم الأرض",
  "علم النفس",
  "مالية",
];

const cleanStr = (str?: string | number | null): string => {
  if (!str) return "";
  return String(str)
    .trim()
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/\s+/g, "")
    .replace(/^(ال)/, "");
};

export default function DossiersPage() {
  const { addToCart, totalItems } = useCart();

  const [dossiersList, setDossiersList] = useState<DossierItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedYear, setSelectedYear] = useState<string | null>(null);
  const [selectedSemester, setSelectedSemester] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [selectedSubTrack, setSelectedSubTrack] = useState<string | null>(null);
  const [selectedDossierType, setSelectedDossierType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    const loadDossiers = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("خطأ في تحميل الدوسيات:", error);
        setDossiersList([]);
      } else {
        const dossiersOnly = (data || []).filter(
          (item: DossierItem) =>
            item.category === "دوسيات" || item.year || item.dossier_type
        );
        setDossiersList(dossiersOnly);
      }

      setLoading(false);
    };

    loadDossiers();
  }, []);

  const handleBack = () => {
    if (selectedDossierType) setSelectedDossierType(null);
    else if (selectedSubTrack) setSelectedSubTrack(null);
    else if (selectedSubject) setSelectedSubject(null);
    else if (selectedSemester) setSelectedSemester(null);
    else if (selectedYear) setSelectedYear(null);
  };

  const resetAll = () => {
    setSelectedYear(null);
    setSelectedSemester(null);
    setSelectedSubject(null);
    setSelectedSubTrack(null);
    setSelectedDossierType(null);
    setSearchQuery("");
  };

  const currentSubjects = selectedYear === "2010" ? SUBJECTS_2010 : SUBJECTS_2009;

  const needsTrackSelection =
    selectedYear === "2009" &&
    (selectedSubject === "الرياضيات" || selectedSubject === "اللغة الإنجليزية");

  const filteredItems = useMemo(() => {
    const normalizedSearch = cleanStr(searchQuery);

    return dossiersList.filter((item) => {
      if (normalizedSearch) {
        const titleClean = cleanStr(item.title);
        const subjectClean = cleanStr(item.subject);
        return (
          titleClean.includes(normalizedSearch) ||
          subjectClean.includes(normalizedSearch)
        );
      }

      const yearMatch =
        !selectedYear ||
        !item.year ||
        String(item.year).trim() === String(selectedYear).trim();

      const itemSem = cleanStr(item.semester);
      const targetSem = cleanStr(selectedSemester);
      const semesterMatch =
        !selectedSemester ||
        !item.semester ||
        itemSem.includes(targetSem) ||
        targetSem.includes(itemSem);

      const itemSub = cleanStr(item.subject);
      const targetSub = cleanStr(selectedSubject);
      const titleClean = cleanStr(item.title);

      const subjectMatch =
        !selectedSubject ||
        !item.subject ||
        itemSub.includes(targetSub) ||
        targetSub.includes(itemSub) ||
        titleClean.includes(targetSub);

      const targetTrack = cleanStr(selectedSubTrack);
      const trackMatch =
        !selectedSubTrack ||
        itemSub.includes(targetTrack) ||
        titleClean.includes(targetTrack);

      const itemType = cleanStr(item.dossier_type);
      const targetType = cleanStr(selectedDossierType);
      const typeMatch =
        !selectedDossierType ||
        !item.dossier_type ||
        itemType.includes(targetType) ||
        targetType.includes(itemType) ||
        titleClean.includes(targetType);

      return yearMatch && semesterMatch && subjectMatch && trackMatch && typeMatch;
    });
  }, [
    dossiersList,
    searchQuery,
    selectedYear,
    selectedSemester,
    selectedSubject,
    selectedSubTrack,
    selectedDossierType,
  ]);

  return (
    <div dir="rtl" className="min-h-screen bg-slate-50 text-slate-800">
      {/* HEADER */}
      <header className="sticky top-0 z-40 backdrop-blur-md bg-white/85 border-b border-blue-100 shadow-sm">
        <div className="max-w-5xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4">
            {selectedYear || searchQuery ? (
              <button
                onClick={() => (searchQuery ? setSearchQuery("") : handleBack())}
                className="p-2 rounded-full hover:bg-slate-100 text-blue-900 transition flex items-center gap-1 font-bold text-sm"
              >
                <ArrowRight className="w-5 h-5" />
                <span>رجوع</span>
              </button>
            ) : (
              <Link
                href="/"
                className="p-2 rounded-full hover:bg-slate-100 text-blue-900 transition"
              >
                <ArrowRight className="w-6 h-6" />
              </Link>
            )}

            <h1 className="text-xl md:text-2xl font-black text-blue-950">
              قسم الدوسيات والبطاقات
            </h1>
          </div>

          <Link
            href="/cart"
            className="relative flex items-center justify-center p-3 rounded-full bg-blue-50 border border-blue-200 hover:bg-blue-100 transition shadow-sm"
          >
            <ShoppingCart className="w-5 h-5 text-blue-900" />
            {totalItems > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-blue-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow">
                {totalItems}
              </span>
            )}
          </Link>
        </div>
      </header>

      {/* BREADCRUMBS & SEARCH */}
      <div className="max-w-5xl mx-auto px-6 pt-6">
        {!searchQuery && (
          <div className="flex items-center gap-2 text-xs md:text-sm text-slate-500 font-bold overflow-x-auto pb-2">
            <button onClick={resetAll} className="hover:text-blue-600 whitespace-nowrap">
              الأجيال
            </button>

            {selectedYear && (
              <>
                <ChevronLeft className="w-4 h-4 text-slate-400" />
                <button
                  onClick={() => {
                    setSelectedSemester(null);
                    setSelectedSubject(null);
                    setSelectedSubTrack(null);
                    setSelectedDossierType(null);
                  }}
                  className="hover:text-blue-600 text-blue-900 whitespace-nowrap"
                >
                  جيل {selectedYear}
                </button>
              </>
            )}

            {selectedSemester && (
              <>
                <ChevronLeft className="w-4 h-4 text-slate-400" />
                <button
                  onClick={() => {
                    setSelectedSubject(null);
                    setSelectedSubTrack(null);
                    setSelectedDossierType(null);
                  }}
                  className="hover:text-blue-600 text-blue-900 whitespace-nowrap"
                >
                  الفصل {selectedSemester}
                </button>
              </>
            )}

            {selectedSubject && (
              <>
                <ChevronLeft className="w-4 h-4 text-slate-400" />
                <button
                  onClick={() => {
                    setSelectedSubTrack(null);
                    setSelectedDossierType(null);
                  }}
                  className="hover:text-blue-600 text-blue-900 whitespace-nowrap"
                >
                  {selectedSubject}
                </button>
              </>
            )}

            {selectedSubTrack && (
              <>
                <ChevronLeft className="w-4 h-4 text-slate-400" />
                <button
                  onClick={() => setSelectedDossierType(null)}
                  className="hover:text-blue-600 text-blue-900 whitespace-nowrap"
                >
                  {selectedSubTrack}
                </button>
              </>
            )}

            {selectedDossierType && (
              <>
                <ChevronLeft className="w-4 h-4 text-slate-400" />
                <span className="text-blue-600 whitespace-nowrap">
                  {selectedDossierType}
                </span>
              </>
            )}
          </div>
        )}

        <div className="relative mt-4 mb-2">
          <input
            type="text"
            placeholder="ابحث مباشرة عن اسم الدوسية أو المادة..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-white border border-blue-200 rounded-2xl outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition shadow-sm text-sm font-bold text-blue-950"
          />
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-6 py-6">
        {loading ? (
          <div className="bg-white border border-blue-100 rounded-2xl p-10 text-center shadow-sm">
            <div className="animate-pulse">
              <BookOpen className="w-10 h-10 mx-auto text-blue-400 mb-3" />
              <p className="font-bold text-slate-500">جاري تحميل الدوسيات...</p>
            </div>
          </div>
        ) : searchQuery ? (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-black text-blue-950">
                نتائج البحث عن: &quot;{searchQuery}&quot; ({filteredItems.length})
              </h2>
              <button
                onClick={() => setSearchQuery("")}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                إلغاء البحث
              </button>
            </div>

            {filteredItems.length === 0 ? (
              <div className="bg-white border border-blue-100 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
                <p className="font-bold">لا توجد دوسيات مطابقة لبحثك.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {filteredItems.map((item) => (
                  <DossierCard key={item.id} item={item} addToCart={addToCart} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Step 1: Year */}
            {!selectedYear && (
              <div>
                <h2 className="text-lg font-black text-blue-950 mb-4">
                  اختر الجيل الدراسي:
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {["2010", "2009"].map((year) => (
                    <button
                      key={year}
                      onClick={() => setSelectedYear(year)}
                      className="p-6 bg-white border border-blue-100 hover:border-blue-500 rounded-2xl shadow-sm hover:shadow-md transition text-right flex items-center justify-between group"
                    >
                      <div>
                        <h3 className="text-2xl font-black text-blue-950 group-hover:text-blue-600 transition">
                          دوسيات جيل {year}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          تصفح مواد الدعم والمناهج الخاصة بهذا الجيل
                        </p>
                      </div>
                      <Layers className="w-8 h-8 text-blue-500 group-hover:scale-110 transition" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2: Semester */}
            {selectedYear && !selectedSemester && (
              <div>
                <h2 className="text-lg font-black text-blue-950 mb-4">
                  اختر الفصل الدراسي لجيل {selectedYear}:
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {SEMESTERS.map((sem) => (
                    <button
                      key={sem.value}
                      onClick={() => setSelectedSemester(sem.value)}
                      className="p-6 bg-white border border-blue-100 hover:border-blue-500 rounded-2xl shadow-sm hover:shadow-md transition text-right flex items-center justify-between group"
                    >
                      <div>
                        <h3 className="text-xl font-black text-blue-950 group-hover:text-blue-600 transition">
                          {sem.label}
                        </h3>
                        <p className="text-xs text-slate-400 mt-1">
                          دوسيات هذا الفصل الدراسي
                        </p>
                      </div>
                      <Calendar className="w-7 h-7 text-blue-500 group-hover:scale-110 transition" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Subject */}
            {selectedYear && selectedSemester && !selectedSubject && (
              <div>
                <h2 className="text-lg font-black text-blue-950 mb-4">
                  اختر المادة الدراسية:
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {currentSubjects.map((sub) => (
                    <button
                      key={sub}
                      onClick={() => setSelectedSubject(sub)}
                      className="p-5 bg-white border border-blue-100 hover:border-blue-500 rounded-2xl shadow-sm hover:shadow-md transition text-right flex items-center justify-between group"
                    >
                      <span className="font-black text-base text-blue-950 group-hover:text-blue-600 transition">
                        {sub}
                      </span>
                      <ChevronLeft className="w-5 h-5 text-blue-400 group-hover:-translate-x-1 transition" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3.5: Sub-Track */}
            {selectedYear &&
              selectedSemester &&
              selectedSubject &&
              needsTrackSelection &&
              !selectedSubTrack && (
                <div>
                  <h2 className="text-lg font-black text-blue-950 mb-4">
                    اختر مسار مادة ({selectedSubject}):
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {["متقدم", "أعمال"].map((track) => (
                      <button
                        key={track}
                        onClick={() => setSelectedSubTrack(track)}
                        className="p-6 bg-white border border-blue-100 hover:border-blue-500 rounded-2xl shadow-sm hover:shadow-md transition text-right flex items-center justify-between group"
                      >
                        <div>
                          <h3 className="text-xl font-black text-blue-950 group-hover:text-blue-600 transition">
                            {selectedSubject} ({track})
                          </h3>
                          <p className="text-xs text-slate-400 mt-1">
                            عرض دوسيات مسار الـ {track}
                          </p>
                        </div>
                        <ChevronLeft className="w-6 h-6 text-blue-500 group-hover:-translate-x-1 transition" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

            {/* Step 4: Dossier Type */}
            {selectedYear &&
              selectedSemester &&
              selectedSubject &&
              (!needsTrackSelection || selectedSubTrack) &&
              !selectedDossierType && (
                <div>
                  <h2 className="text-lg font-black text-blue-950 mb-4">
                    اختر نوع الدوسية:
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {DOSSIER_TYPES.map((type) => (
                      <button
                        key={type}
                        onClick={() => setSelectedDossierType(type)}
                        className="p-6 bg-white border border-blue-100 hover:border-blue-500 rounded-2xl shadow-sm hover:shadow-md transition text-center group"
                      >
                        <BookOpen className="w-8 h-8 mx-auto mb-3 text-blue-500 group-hover:scale-110 transition" />
                        <h3 className="text-xl font-black text-blue-950 group-hover:text-blue-600 transition">
                          {type}
                        </h3>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            {/* Step 5: Cards List */}
            {selectedYear &&
              selectedSemester &&
              selectedSubject &&
              (!needsTrackSelection || selectedSubTrack) &&
              selectedDossierType && (
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h2 className="text-lg font-black text-blue-950">
                        {selectedSubject} {selectedSubTrack ? `(${selectedSubTrack})` : ""}
                      </h2>
                      <p className="text-sm text-slate-500 font-bold mt-1">
                        {selectedDossierType} — الفصل {selectedSemester} — جيل {selectedYear}
                      </p>
                    </div>
                  </div>

                  {filteredItems.length === 0 ? (
                    <div className="bg-white border border-blue-100 rounded-2xl p-8 text-center text-slate-500 shadow-sm">
                      <BookOpen className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                      <p className="font-bold">
                        لا توجد دوسيات مضافة لهذه الخيارات حالياً.
                      </p>
                      <p className="text-xs mt-2 text-slate-400">
                        يمكنك البحث مباشرة عن اسم الدوسية في شريط البحث بالأعلى.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {filteredItems.map((item) => (
                        <DossierCard key={item.id} item={item} addToCart={addToCart} />
                      ))}
                    </div>
                  )}
                </div>
              )}
          </>
        )}
      </main>
    </div>
  );
}

function DossierCard({
  item,
  addToCart,
}: {
  item: DossierItem;
  addToCart: (item: { id: string | number; name: string; price: number; image?: string }, qty: number) => void;
}) {
  return (
    <div className="bg-white border border-blue-100 rounded-2xl overflow-hidden hover:border-blue-400 shadow-sm hover:shadow-md transition flex flex-col">
      <div className="relative h-48 bg-slate-100">
        {item.image ? (
          <Image
            src={item.image}
            alt={item.title}
            fill
            sizes="(max-width: 640px) 100vw, 50vw"
            className="object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-slate-300" />
          </div>
        )}
      </div>

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex flex-wrap gap-2 mb-3">
          {item.year && (
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 text-xs font-bold">
              جيل {item.year}
            </span>
          )}
          {item.semester && (
            <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold">
              {item.semester.includes("الفصل") ? item.semester : `الفصل ${item.semester}`}
            </span>
          )}
          {item.dossier_type && (
            <span className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 text-xs font-bold">
              {item.dossier_type}
            </span>
          )}
        </div>

        <h3 className="text-base font-black text-blue-950 mb-3">{item.title}</h3>

        <span className="text-lg font-black text-blue-800 mt-auto">
          {Number(item.price || 0).toFixed(2)} دينار
        </span>
      </div>

      <div className="p-4 bg-slate-50 border-t border-slate-100">
        <button
          onClick={() => {
            addToCart(
              {
                id: item.id,
                name: item.title,
                price: Number(item.price),
                image: item.image,
              },
              1
            );
            alert("تمت الإضافة إلى السلة بنجاح!");
          }}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition flex items-center justify-center gap-2 shadow-sm text-sm"
        >
          <ShoppingCart className="w-4 h-4" />
          إضافة إلى السلة
        </button>
      </div>
    </div>
  );
}
