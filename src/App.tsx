import React, { useState, useEffect } from 'react';
import { Volume2, CheckCircle, Target, Calendar, Brain, Zap, ArrowRight, ArrowLeft, RotateCcw } from 'lucide-react';

const EnglishLearningApp = () => {
  const [currentSentence, setCurrentSentence] = useState(0);
  const [showTranslation, setShowTranslation] = useState(false);
  const [completedToday, setCompletedToday] = useState(0);
  const [monthlyWords, setMonthlyWords] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [learnedWords, setLearnedWords] = useState(new Map()); // word -> { learned: true/false, lastSeen: timestamp, reviewCount: 0 }
  const [sentences, setSentences] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedWord, setSelectedWord] = useState(null);
  const [reviewWords, setReviewWords] = useState(new Set()); // Tekrar edilecek kelimeler

  // Kelime çevirileri - daha kapsamlı
  const translations = {
    "usually": "genellikle", "breakfast": "kahvaltı", "before": "önce",
    "neighbor": "komşu", "barks": "havlar", "loudly": "yüksek sesle",
    "medicine": "ilaç", "twice": "iki kez", "told": "söyledi",
    "saving": "biriktirmek", "laptop": "dizüstü bilgisayar", "studies": "çalışmalar",
    "delayed": "gecikmek", "heavy rain": "şiddetli yağmur", "fluently": "akıcı bir şekilde",
    "translator": "çevirmen", "ordered": "sipariş etmek", "comedy": "komedi",
    "weekend": "hafta sonu", "comfortable": "rahat", "quite": "oldukça",
    "expensive": "pahalı", "forgot": "unutmak", "umbrella": "şemsiye",
    "completely wet": "tamamen ıslak", "closes": "kapatmak", "weekdays": "hafta içi",
    "sufficient": "yeterli", "advanced": "gelişmiş", "technology": "teknoloji",
    "equivalent": "eşdeğer", "magic": "sihir", "house": "ev", "divided": "bölünmüş",
    "against": "karşısında", "itself": "kendisi", "cannot": "yapamaz", "stand": "durmak"
  };

  // API'den cümle çekme fonksiyonu
  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://api.quotable.io/quotes/random?limit=10&minLength=30&maxLength=120');
      const data = await response.json();
      
      const processedQuotes = data.map(quote => ({
        english: quote.content,
        turkish: `${quote.content} - ${quote.author}`, // Geçici çeviri, gerçekte Google Translate API kullanılabilir
        newWords: extractNewWords(quote.content),
        topic: quote.tags[0] || "Genel",
        author: quote.author
      }));

      setSentences(prev => [...prev, ...processedQuotes]);
    } catch (error) {
      console.error('API Error:', error);
      // Fallback cümleler
      const fallbackQuotes = [
        {
          english: "Any sufficiently advanced technology is equivalent to magic.",
          turkish: "Yeterince gelişmiş herhangi bir teknoloji sihire eşdeğerdir.",
          newWords: ["sufficient", "advanced", "technology", "equivalent", "magic"],
          topic: "Technology"
        },
        {
          english: "A house divided against itself cannot stand.",
          turkish: "Kendisine karşı bölünmüş bir ev ayakta duramaz.",
          newWords: ["house", "divided", "against", "itself", "cannot", "stand"],
          topic: "Politics"
        }
      ];
      setSentences(prev => [...prev, ...fallbackQuotes]);
    }
    setLoading(false);
  };

  // Yeni kelimeler çıkarma (basit algoritma)
  const extractNewWords = (text) => {
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall'];
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(' ');
    return words.filter(word => word.length > 3 && !commonWords.includes(word)).slice(0, 3);
  };

  // Spaced Repetition sistemi
  const getNextReviewDate = (reviewCount) => {
    const intervals = [1, 3, 7, 14, 30]; // günler
    const days = intervals[Math.min(reviewCount, intervals.length - 1)];
    return Date.now() + (days * 24 * 60 * 60 * 1000);
  };

  const checkForReviews = () => {
    const now = Date.now();
    const wordsNeedingReview = new Set();
    
    learnedWords.forEach((data, word) => {
      if (data.learned && data.nextReview && now >= data.nextReview) {
        wordsNeedingReview.add(word);
      }
    });
    
    setReviewWords(wordsNeedingReview);
  };

  useEffect(() => {
    fetchQuotes();
    checkForReviews();
    // Her 10 saniyede kontrol et (gerçekte günde bir kez olmalı)
    const reviewInterval = setInterval(checkForReviews, 10000);
    return () => clearInterval(reviewInterval);
  }, []);

  useEffect(() => {
    if (currentSentence >= sentences.length - 3 && sentences.length > 0) {
      fetchQuotes();
    }
  }, [currentSentence, sentences.length]);

  const currentSent = sentences[currentSentence];

  const speakSentence = () => {
    if ('speechSynthesis' in window && currentSent) {
      const utterance = new SpeechSynthesisUtterance(currentSent.english);
      utterance.lang = 'en-US';
      utterance.rate = 0.8;
      speechSynthesis.speak(utterance);
      setIsPlaying(true);
      utterance.onend = () => setIsPlaying(false);
    }
  };

  const nextSentence = () => {
    setCurrentSentence(currentSentence + 1);
    setShowTranslation(false);
    setSelectedWord(null);
  };

  const previousSentence = () => {
    if (currentSentence > 0) {
      setCurrentSentence(currentSentence - 1);
      setShowTranslation(false);
      setSelectedWord(null);
    }
  };

  const handleWordClick = (word) => {
    setSelectedWord(word);
  };

  const markWordStatus = (word, learned) => {
    const newLearnedWords = new Map(learnedWords);
    const existingData = newLearnedWords.get(word) || { learned: false, lastSeen: 0, reviewCount: 0, nextReview: 0 };
    
    if (learned) {
      // "Öğrendim" seçildi
      const newReviewCount = existingData.reviewCount + 1;
      newLearnedWords.set(word, {
        learned: true,
        lastSeen: Date.now(),
        reviewCount: newReviewCount,
        nextReview: getNextReviewDate(newReviewCount)
      });
      setMonthlyWords(monthlyWords + 1);
      setCompletedToday(completedToday + 1);
      setReviewWords(prev => {
        const updated = new Set(prev);
        updated.delete(word);
        return updated;
      });
    } else {
      // "Biliyorum" seçildi - hedefe ekleme
      newLearnedWords.set(word, {
        learned: false,
        lastSeen: Date.now(),
        reviewCount: 0,
        nextReview: 0
      });
    }
    
    setLearnedWords(newLearnedWords);
    setSelectedWord(null);
  };

  if (!currentSent) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/70 text-lg font-light">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  // iOS 26 Liquid Glass renk paleti
  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      
      {/* iOS 26 Dynamic Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-blue-600/5 via-purple-600/5 to-pink-600/5"></div>
        <div className="absolute top-1/4 left-1/3 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 bg-purple-500/8 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      {/* Status Bar - iOS 26 Style */}
      <div className="relative z-10" style={{...glassStyle, borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
        <div className="flex justify-between items-center px-6 py-4">
          <div className="text-sm font-medium text-white/90">English Academy</div>
          <div className="flex gap-6 text-center">
            <div>
              <div className="text-lg font-semibold text-white">{completedToday}</div>
              <div className="text-xs text-white/50">Bugün</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-blue-400">{monthlyWords}</div>
              <div className="text-xs text-white/50">Bu Ay</div>
            </div>
            <div className="relative">
              <div className="text-lg font-semibold text-white/70">50</div>
              <div className="text-xs text-white/50">Hedef</div>
              {reviewWords.size > 0 && (
                <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-xs font-bold text-white">{reviewWords.size}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="relative z-10 px-6 py-8">
        
        {/* Review Words Alert - iOS 26 Style */}
        {reviewWords.size > 0 && (
          <div className="mb-6 p-4 rounded-2xl" style={{...glassStyle, background: 'rgba(255, 193, 7, 0.1)'}}>
            <div className="flex items-center gap-3">
              <RotateCcw className="w-5 h-5 text-yellow-400" />
              <div>
                <p className="text-yellow-400 font-medium">Tekrar Zamanı!</p>
                <p className="text-white/70 text-sm">{reviewWords.size} kelimeyi tekrar etmen gerekiyor</p>
              </div>
            </div>
          </div>
        )}

        {/* Progress - iOS 26 Liquid Style */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-3">
            <span className="text-sm font-medium text-white/70">Cümle {currentSentence + 1}</span>
            <span className="text-sm font-medium text-blue-400 px-3 py-1 rounded-full" style={glassStyle}>
              {currentSent.topic}
            </span>
          </div>
          <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden" style={{backdropFilter: 'blur(10px)'}}>
            <div 
              className="h-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-1000"
              style={{width: `${Math.min((monthlyWords / 50) * 100, 100)}%`}}
            ></div>
          </div>
        </div>

        {/* Main Sentence Card - Enhanced iOS 26 Liquid Glass */}
        <div className="rounded-3xl p-8 mb-8 shadow-2xl" style={{...glassStyle, background: 'rgba(255, 255, 255, 0.04)'}}>
          <div className="text-center mb-8">
            <p className="text-2xl md:text-3xl font-light leading-relaxed mb-6 text-white/95">
              {currentSent.english}
            </p>
            
            <button
              onClick={speakSentence}
              disabled={isPlaying}
              className="w-16 h-16 rounded-full flex items-center justify-center mx-auto transition-all duration-300 active:scale-95 shadow-lg"
              style={{
                background: isPlaying 
                  ? 'linear-gradient(135deg, rgba(59, 130, 246, 0.6) 0%, rgba(147, 51, 234, 0.6) 100%)'
                  : 'linear-gradient(135deg, rgba(59, 130, 246, 0.8) 0%, rgba(147, 51, 234, 0.8) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              <Volume2 className="w-6 h-6 text-white" />
            </button>
          </div>

          {/* Translation Toggle */}
          <div className="text-center mb-8">
            {!showTranslation ? (
              <button
                onClick={() => setShowTranslation(true)}
                className="text-white/60 hover:text-white/90 transition-colors duration-200 text-sm px-4 py-2 rounded-full"
                style={{background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(10px)'}}
              >
                Çeviriyi göster
              </button>
            ) : (
              <div className="rounded-2xl p-6 animate-fadeIn" style={{...glassStyle, background: 'rgba(59, 130, 246, 0.08)'}}>
                <p className="text-xl font-light text-white/90 mb-2">
                  {currentSent.turkish}
                </p>
                {currentSent.author && (
                  <p className="text-sm text-blue-300">— {currentSent.author}</p>
                )}
              </div>
            )}
          </div>

          {/* Words Section - Enhanced with Review Status */}
          {showTranslation && (
            <div className="mb-8">
              <h3 className="text-lg font-medium mb-4 text-center text-white/80 flex items-center justify-center gap-2">
                <Brain className="w-5 h-5" />
                Yeni Kelimeler
              </h3>
              <div className="flex flex-wrap justify-center gap-3">
                {currentSent.newWords.map((word, index) => {
                  const wordData = learnedWords.get(word);
                  const isLearned = wordData?.learned;
                  const needsReview = reviewWords.has(word);
                  
                  return (
                    <button
                      key={index}
                      onClick={() => handleWordClick(word)}
                      className={`px-5 py-3 rounded-full text-sm font-medium transition-all duration-300 active:scale-95 shadow-md ${
                        needsReview
                          ? 'bg-red-500/20 text-red-300 border border-red-400/40 animate-pulse'
                          : isLearned 
                            ? 'bg-green-500/20 text-green-300 border border-green-400/40' 
                            : 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/40 hover:bg-yellow-500/30'
                      }`}
                      style={{backdropFilter: 'blur(15px)'}}
                    >
                      {word}
                      {needsReview && ' 🔄'}
                      {isLearned && !needsReview && ' ✓'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Navigation - iOS 26 Style */}
          <div className="flex justify-between items-center">
            <button
              onClick={previousSentence}
              disabled={currentSentence === 0}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 disabled:opacity-30"
              style={{...glassStyle, background: currentSentence === 0 ? 'rgba(255, 255, 255, 0.02)' : 'rgba(255, 255, 255, 0.06)'}}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <button
              onClick={nextSentence}
              className="w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 active:scale-95 shadow-lg"
              style={{
                background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.8) 0%, rgba(147, 51, 234, 0.8) 100%)',
                backdropFilter: 'blur(20px)',
                border: '1px solid rgba(255, 255, 255, 0.2)'
              }}
            >
              <ArrowRight className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* Loading Indicator */}
        {loading && (
          <div className="text-center py-4">
            <div className="w-6 h-6 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm text-white/50">Yeni cümleler yükleniyor...</p>
          </div>
        )}
      </div>

      {/* Word Learning Modal - Compact iOS 26 Style */}
      {selectedWord && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="rounded-2xl p-6 max-w-xs w-full shadow-2xl animate-fadeIn" style={{...glassStyle, background: 'rgba(255, 255, 255, 0.08)'}}>
            <div className="text-center">
              <h3 className="text-xl font-semibold mb-1 text-white">{selectedWord}</h3>
              <p className="text-lg text-blue-300 mb-4">{translations[selectedWord] || 'Çeviri bulunamadı'}</p>
              
              <div className="space-y-3">
                <button
                  onClick={() => markWordStatus(selectedWord, true)}
                  className="w-full py-3 rounded-xl font-medium transition-all duration-200 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.7) 0%, rgba(22, 163, 74, 0.7) 100%)',
                    backdropFilter: 'blur(15px)',
                    border: '1px solid rgba(34, 197, 94, 0.3)'
                  }}
                >
                  ✓ Öğrendim
                </button>
                
                <button
                  onClick={() => markWordStatus(selectedWord, false)}
                  className="w-full py-3 rounded-xl font-medium transition-all duration-200 active:scale-95"
                  style={{...glassStyle, background: 'rgba(255, 255, 255, 0.08)'}}
                >
                  👀 Biliyorum
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
      `}</style>
    </div>
  );
};

export default EnglishLearningApp;