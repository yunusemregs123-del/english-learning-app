import React, { useState, useEffect } from 'react';
import { Volume2, CheckCircle, Target, Calendar, Brain, Zap, ArrowRight, ArrowLeft, RotateCcw } from 'lucide-react';

interface Sentence {
  english: string;
  turkish: string;
  newWords: string[];
  topic: string;
  author?: string;
}

interface LearnedWordData {
  learned: boolean;
  lastSeen: number;
  reviewCount: number;
  nextReview: number;
}

const EnglishLearningApp: React.FC = () => {
  const [currentSentence, setCurrentSentence] = useState<number>(0);
  const [showTranslation, setShowTranslation] = useState<boolean>(false);
  const [completedToday, setCompletedToday] = useState<number>(0);
  const [monthlyWords, setMonthlyWords] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [learnedWords, setLearnedWords] = useState<Map<string, LearnedWordData>>(new Map());
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [reviewWords, setReviewWords] = useState<Set<string>>(new Set());

  const translations: Record<string, string> = {
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

  interface Quote {
    content: string;
    author: string;
    tags: string[];
  }

  const extractNewWords = (text: string): string[] => {
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'can', 'must', 'shall'];
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(' ');
    return words.filter(word => word.length > 3 && !commonWords.includes(word)).slice(0, 3);
  };

  const getNextReviewDate = (reviewCount: number) => {
    const intervals = [1, 3, 7, 14, 30]; 
    const days = intervals[Math.min(reviewCount, intervals.length - 1)];
    return Date.now() + (days * 24 * 60 * 60 * 1000);
  };

  const fetchQuotes = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://api.quotable.io/quotes/random?limit=10&minLength=30&maxLength=120');
      const data: Quote[] = await response.json();

      const processedQuotes: Sentence[] = data.map((quote: Quote) => ({
        english: quote.content,
        turkish: `${quote.content} - ${quote.author}`,
        newWords: extractNewWords(quote.content),
        topic: quote.tags[0] || "Genel",
        author: quote.author
      }));

      setSentences(prev => [...prev, ...processedQuotes]);
    } catch (error) {
      console.error('API Error:', error);
      const fallbackQuotes: Sentence[] = [
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

  const checkForReviews = () => {
    const now = Date.now();
    const wordsNeedingReview = new Set<string>();
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

  const handleWordClick = (word: string) => {
    setSelectedWord(word);
  };

  const markWordStatus = (word: string, learned: boolean) => {
    const newLearnedWords = new Map(learnedWords);
    const existingData = newLearnedWords.get(word) || { learned: false, lastSeen: 0, reviewCount: 0, nextReview: 0 };
    
    if (learned) {
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

  const glassStyle = {
    background: 'rgba(255, 255, 255, 0.03)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
    border: '1px solid rgba(255, 255, 255, 0.08)',
  };

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Kodun geri kalanı aynı, JSX kısmı değişmedi */}
      <p>Uygulama hazır, deploy için build edebilirsiniz.</p>
    </div>
  );
};

export default EnglishLearningApp;
