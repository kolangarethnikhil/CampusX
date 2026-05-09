import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Home, 
  ShoppingBag, 
  Bookmark, 
  MessageSquare, 
  User, 
  Plus, 
  Search, 
  MapPin,
  TrendingUp,
  Filter,
  X,
  CheckCircle2,
  ChevronRight,
  Send,
  ArrowLeft,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { getHousingListings, HousingListing } from '../../services/housingService';
import { getMarketListings, MarketListing } from '../../services/marketService';
import { saveListing, unsaveListing, getSavedListings, checkIsSaved } from '../../services/savedService';
import { 
  startConversation, 
  subscribeToConversations, 
  subscribeToMessages, 
  sendMessage, 
  Conversation, 
  Message 
} from '../../services/chatService';
import ListingForm from '../features/ListingForm';
import VerificationModal from '../features/VerificationModal';

// --- Types ---
type Tab = 'rooms' | 'market' | 'saved' | 'messages' | 'profile';

// --- Components ---

const BottomNav = ({ activeTab, onTabChange, onAddClick }: { activeTab: Tab, onTabChange: (tab: Tab) => void, onAddClick: () => void }) => {
  const tabs = [
    { id: 'rooms', icon: Home, label: 'Rooms' },
    { id: 'market', icon: ShoppingBag, label: 'Market' },
    { id: 'add', icon: Plus, label: 'Create', special: true },
    { id: 'messages', icon: MessageSquare, label: 'Inbox' },
    { id: 'profile', icon: User, label: 'Profile' }
  ];

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 bg-kjc-black/60 backdrop-blur-3xl rounded-[36px] shadow-pro-lg border border-white/10">
      {tabs.map((tab) => (
        <button 
          key={tab.id}
          onClick={() => {
            if (tab.id === 'add') onAddClick();
            else onTabChange(tab.id as Tab);
          }}
          className={`relative flex flex-col items-center justify-center transition-all duration-300 ${
            tab.special 
              ? 'w-16 h-16 bg-kjc-accent text-white rounded-full -mt-4 shadow-lg shadow-kjc-accent/30 active:scale-90 scale-110' 
              : `w-14 h-14 rounded-full ${activeTab === tab.id ? 'text-white bg-white/10' : 'text-white/40 hover:text-white hover:bg-white/5'} active:scale-90`
          }`}
        >
          <tab.icon size={tab.special ? 30 : 22} strokeWidth={tab.special ? 2.5 : 2} />
          {activeTab === tab.id && !tab.special && (
            <motion.div 
              layoutId="activeTabDot"
              className="absolute -bottom-1 w-1 h-1 bg-kjc-accent rounded-full"
            />
          )}
        </button>
      ))}
    </div>
  );
};

const Header = ({ title, activeTab, onSearch, onFilterClick, showFilters }: { title: string, activeTab: Tab, onSearch: (val: string) => void, onFilterClick: () => void, showFilters: boolean }) => {
  const [isSearching, setIsSearching] = useState(false);
  const [searchVal, setSearchVal] = useState('');

  return (
    <header className="glass-header px-6 py-4">
      <div className="max-w-4xl mx-auto flex justify-between items-center">
        {!isSearching ? (
          <>
            <motion.div 
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="flex flex-col"
            >
               <div className="flex items-center gap-2">
                 <h1 className="text-2xl pro-heading tracking-tighter">Campus<span className="text-kjc-accent italic">X</span></h1>
                 <div className="w-1.5 h-1.5 bg-kjc-accent rounded-full animate-pulse" />
               </div>
            </motion.div>
            <div className="flex items-center gap-2.5">
              <button 
                onClick={() => setIsSearching(true)}
                className="p-3 text-white bg-white/5 rounded-2xl transition-all active:scale-90 border border-white/5 hover:bg-white/10"
              >
                <Search size={22} />
              </button>
              {(activeTab === 'rooms' || activeTab === 'market') && (
                <button 
                   onClick={onFilterClick}
                   className={`p-3 rounded-2xl transition-all active:scale-90 border ${showFilters ? 'bg-kjc-accent text-white border-kjc-accent' : 'bg-white/5 text-white border-white/5 hover:bg-white/10'}`}
                >
                  <Filter size={22} />
                </button>
              )}
            </div>
          </>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex-1 flex items-center gap-3"
          >
            <div className="relative flex-1">
               <Search size={18} className="absolute left-6 top-1/2 -translate-y-1/2 text-white/40" />
               <input 
                 autoFocus
                 value={searchVal}
                 onChange={(e) => {
                   setSearchVal(e.target.value);
                   onSearch(e.target.value);
                 }}
                 placeholder="Search campus..."
                 className="input-pro pl-14"
               />
            </div>
            <button 
              onClick={() => { 
                setIsSearching(false); 
                setSearchVal('');
                onSearch('');
              }}
              className="p-3 bg-white/5 text-white rounded-2xl active:scale-90 border border-white/5"
            >
              <X size={24} />
            </button>
          </motion.div>
        )}
      </div>
    </header>
  );
};

const ListingCard: React.FC<{ 
  listing: HousingListing | MarketListing, 
  type: 'housing' | 'market',
  onContact: (ownerId: string, listingId: string, title: string, type: string) => void | Promise<void>
}> = ({ 
  listing, 
  type, 
  onContact 
}) => {
  const [isSaved, setIsSaved] = useState(false);
  const [saveId, setSaveId] = useState<string | null>(null);
  const { user, signIn } = useAuth();

  useEffect(() => {
    checkSaved();
  }, [listing.id, user]);

  const checkSaved = async () => {
    const res = await checkIsSaved(listing.id!);
    if (res) {
      setIsSaved(res.saved);
      setSaveId(res.saveId);
    }
  };

  const handleToggleSave = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      await signIn();
      return;
    }
    if (isSaved && saveId) {
      await unsaveListing(saveId);
      setIsSaved(false);
      setSaveId(null);
    } else {
      const id = await saveListing(listing.id!, type);
      setIsSaved(true);
      setSaveId(id);
    }
  };

  const isHousing = type === 'housing';
  const hListing = listing as HousingListing;
  const mListing = listing as MarketListing;
  const price = isHousing ? hListing.rent : mListing.price;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileTap={{ scale: 0.98 }}
      className="group relative bg-white/5 rounded-[48px] border border-white/10 overflow-hidden shadow-pro hover:shadow-pro-lg transition-all duration-500 mb-8"
    >
      <div className="relative aspect-[16/10] overflow-hidden">
        {listing.photos && listing.photos[0] ? (
          <img 
            src={listing.photos[0]} 
            alt={listing.title}
            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="w-full h-full bg-white/[0.02] flex items-center justify-center text-white/10">
             {isHousing ? <Home size={64} strokeWidth={1} /> : <ShoppingBag size={64} strokeWidth={1} />}
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-kjc-black/80 via-transparent to-transparent" />
        
        <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
           <div className="flex flex-col gap-2">
              <span className={`pro-badge ${isHousing ? 'bg-kjc-accent' : 'bg-white/20 backdrop-blur-md'} text-white shadow-xl`}>
                {isHousing ? (hListing.roomType || 'Residence') : (mListing.category || 'Market')}
              </span>
              {isHousing && hListing.genderPreference && hListing.genderPreference !== 'none' && (
                <span className="pro-badge bg-white/10 backdrop-blur-md text-white border border-white/10">
                  {hListing.genderPreference} Only
                </span>
              )}
           </div>
           <button 
             onClick={handleToggleSave}
             className={`w-12 h-12 rounded-3xl flex items-center justify-center transition-all backdrop-blur-xl border ${
               isSaved 
                ? 'bg-rose-500 text-white border-rose-500 scale-110 shadow-lg shadow-rose-500/20' 
                : 'bg-black/20 text-white border-white/20 hover:bg-white/20'
             }`}
           >
             <Bookmark size={20} fill={isSaved ? 'currentColor' : 'none'} />
           </button>
        </div>

        <div className="absolute bottom-6 left-8 right-8 flex justify-between items-end">
           <div className="flex flex-col">
              <div className="flex items-baseline gap-1.5">
                <span className="text-white/40 text-[10px] font-black uppercase tracking-widest">₹</span>
                <span className="text-3xl font-display font-black text-white tracking-tighter">
                  {price.toLocaleString()}
                </span>
                {isHousing && <span className="text-white/40 text-[10px] uppercase font-bold tracking-[0.2em] pl-1">/ month</span>}
              </div>
              {isHousing && hListing.maintenance ? (
                <p className="text-[8px] text-white/30 font-bold uppercase tracking-[0.2em] mt-1">Incl. ₹{hListing.maintenance} maintenance</p>
              ) : null}
           </div>
           {!isHousing && (listing as any).isNegotiable && (
             <span className="pro-badge bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] px-3 py-1.5 backdrop-blur-md">Negotiable</span>
           )}
        </div>
      </div>

      <div className="p-8 pt-6 space-y-5">
        <div>
          <h3 className="text-2xl pro-heading mb-2 group-hover:text-kjc-accent transition-colors truncate tracking-[-0.03em]">{listing.title}</h3>
          <div className="flex items-center gap-2.5 text-white/40">
            <MapPin size={14} className="shrink-0 text-kjc-accent" />
            <p className="text-[10px] font-black uppercase tracking-[0.25em] truncate">
              {listing.formattedAddress ? listing.formattedAddress.split(',')[0] : (listing as any).location || 'Campus Area'}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2.5">
           <span className="text-[9px] font-black bg-white/[0.03] text-white/60 px-4 py-2 rounded-xl uppercase tracking-[0.15em] border border-white/5">
             {isHousing ? (hListing.furnishing || 'Unfurnished') : ((listing as any).condition || 'Good')}
           </span>
           {!isHousing && (
             <span className="text-[9px] font-black bg-kjc-accent/10 text-kjc-accent px-4 py-2 rounded-xl uppercase tracking-[0.15em] border border-kjc-accent/20">
               {mListing.category}
             </span>
           )}
           {isHousing && hListing.amenities?.slice(0, 2).map((a, i) => (
             <span key={i} className="text-[9px] font-black bg-white/[0.03] text-white/60 px-4 py-2 rounded-xl uppercase tracking-[0.15em] border border-white/5">
               {a}
             </span>
           ))}
        </div>

        {isHousing && hListing.preferTenants && (
          <div className="bg-white/[0.02] border border-white/5 p-4 rounded-3xl">
            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] leading-none mb-2">Ideal Resident</p>
            <p className="text-[11px] font-bold text-kjc-accent/80 tracking-tight">{hListing.preferTenants} Jayantians Prefered</p>
          </div>
        )}

        <div className="pt-2">
           <button 
             onClick={() => onContact(listing.postedBy, listing.id, listing.title, type)}
             className="w-full bg-kjc-navy text-white py-5 rounded-[28px] font-black uppercase tracking-[0.3em] text-[10px] hover:bg-kjc-accent transition-all flex items-center justify-center gap-3 overflow-hidden group/btn shadow-pro active:scale-[0.98] border border-white/5"
           >
             Secure Channel
             <Send size={16} className="translate-x-[-10px] opacity-0 group-hover/btn:translate-x-0 group-hover/btn:opacity-100 transition-all duration-300" />
           </button>
        </div>
      </div>
    </motion.div>
  );
};

const Chattery = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedChat, setSelectedChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    const unsub = subscribeToConversations(setConversations);
    return unsub;
  }, []);

  useEffect(() => {
    if (selectedChat) {
      const unsub = subscribeToMessages(selectedChat.id, setMessages);
      return unsub;
    }
  }, [selectedChat]);

  const handleSend = async () => {
    if (!input.trim() || !selectedChat) return;
    await sendMessage(selectedChat.id, input.trim());
    setInput('');
  };

  if (selectedChat) {
    return (
      <div className="fixed inset-0 z-[120] bg-kjc-black flex flex-col">
        <header className="p-8 bg-kjc-black/60 backdrop-blur-3xl border-b border-white/10 flex items-center justify-between sticky top-0">
          <div className="flex items-center gap-5">
            <button onClick={() => setSelectedChat(null)} className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center text-white/40 active:scale-90 transition-all border border-white/5 hover:text-white">
              <ArrowLeft size={24} />
            </button>
            <div>
               <h3 className="pro-heading text-xl tracking-tighter leading-none">{selectedChat.listingTitle}</h3>
               <div className="flex items-center gap-2 mt-2">
                 <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                 <p className="text-[9px] font-black uppercase text-emerald-500 tracking-[0.3em]">Encrypted Channel</p>
               </div>
            </div>
          </div>
          <div className="w-12 h-12 bg-white/5 rounded-3xl flex items-center justify-center text-kjc-accent border border-white/5">
            <ShieldCheck size={24} />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide">
          {messages.length === 0 && (
            <div className="text-center py-24 space-y-6">
              <div className="w-20 h-20 bg-white/5 rounded-[32px] flex items-center justify-center text-white/10 mx-auto border border-white/5">
                <MessageSquare size={32} strokeWidth={1} />
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/20">Beginning of secure briefing</p>
            </div>
          )}
          {messages.map((m, idx) => {
            const isMe = m.senderId === user?.uid;
            const mDate = m.createdAt?.toDate?.() || new Date(m.createdAt);
            const prevM = messages[idx-1];
            const prevDate = prevM ? (prevM.createdAt?.toDate?.() || new Date(prevM.createdAt)) : null;
            const showTime = idx === 0 || mDate.getMinutes() !== prevDate?.getMinutes();
            
            return (
              <div key={m.id} className="space-y-2">
                {showTime && (
                  <p className="text-center text-[9px] font-black text-white/20 uppercase tracking-[0.4em] py-3">
                    {mDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
                <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                  <motion.div 
                    initial={{ scale: 0.9, opacity: 0, y: 10 }}
                    animate={{ scale: 1, opacity: 1, y: 0 }}
                    className={`max-w-[85%] px-6 py-5 text-sm font-medium leading-relaxed tracking-tight shadow-pro border ${
                      isMe 
                        ? 'bg-kjc-accent text-white rounded-[32px] rounded-tr-[4px] border-kjc-accent/20' 
                        : 'bg-white/5 text-white/80 rounded-[32px] rounded-tl-[4px] border-white/10'
                    }`}
                  >
                    {m.content}
                  </motion.div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-8 bg-kjc-black/60 backdrop-blur-3xl border-t border-white/10">
          <div className="flex gap-4 max-w-2xl mx-auto items-center">
             <input 
               value={input}
               onChange={(e) => setInput(e.target.value)}
               placeholder="Transmit offer..."
               className="flex-1 input-pro"
               onKeyDown={(e) => e.key === 'Enter' && handleSend()}
             />
             <button 
               onClick={handleSend}
               disabled={!input.trim()}
               className="w-16 h-16 bg-kjc-accent text-white rounded-[24px] flex items-center justify-center hover:bg-kjc-accent/90 active:scale-95 transition-all shadow-lg shadow-kjc-accent/20 disabled:opacity-40"
             >
               <Send size={24} />
             </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col gap-1 mb-2">
        <h2 className="text-4xl pro-heading tracking-tighter">Campus<span className="text-kjc-accent italic">X</span> Briefs</h2>
        <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.4em]">Zero-Knowledge Secure Messaging</p>
      </div>
      
      {conversations.length === 0 ? (
        <div className="text-center py-24 bg-white/5 rounded-[56px] border border-dashed border-white/10">
          <div className="w-24 h-24 bg-white/5 rounded-[40px] mx-auto mb-8 flex items-center justify-center text-white/10">
            <MessageSquare size={40} strokeWidth={1} />
          </div>
          <h2 className="pro-heading text-2xl mb-2 tracking-tighter">Transmission Void</h2>
          <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.3em] px-12 leading-relaxed">No secure channels established yet.</p>
        </div>
      ) : (
        <div className="grid gap-5">
          {conversations.map(conv => (
            <motion.button 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              key={conv.id}
              onClick={() => setSelectedChat(conv)}
              className="w-full bg-white/5 p-8 rounded-[48px] border border-white/5 flex items-center gap-6 hover:bg-white/[0.08] hover:border-white/10 active:scale-95 group transition-all"
            >
              <div className="relative">
                <div className="w-16 h-16 bg-white/5 rounded-3xl flex items-center justify-center text-white/40 group-hover:bg-kjc-accent group-hover:text-white transition-all duration-500 shadow-inner">
                  {conv.listingType === 'housing' ? <Home size={28} /> : <ShoppingBag size={28} />}
                </div>
                {(conv.unreadCount ?? 0) > 0 && (
  <div className="absolute -top-1 -right-1 w-6 h-6 bg-kjc-accent border-2 border-kjc-black rounded-full flex items-center justify-center text-[10px] font-black text-white shadow-lg">
    {conv.unreadCount ?? 0}
  </div>
                    
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                 <div className="flex justify-between items-start gap-4">
                    <h4 className="pro-heading text-xl truncate tracking-tight">{conv.listingTitle}</h4>
                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest bg-emerald-500/10 px-3 py-1 rounded-full whitespace-nowrap">Live</p>
                 </div>
                 <p className="text-[11px] text-white/40 font-bold line-clamp-1 mt-1 uppercase tracking-wider">{conv.lastMessage || 'Establish first link...'}</p>
              </div>
              <ChevronRight size={20} className="text-white/10 group-hover:text-white group-hover:translate-x-1 transition-all" />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
};

const RoomsPage = ({ listings, loading, onContact, showFilters, setShowFilters }: { listings: HousingListing[], loading: boolean, onContact: any, showFilters: boolean, setShowFilters: (v: boolean) => void }) => {
  const [category, setCategory] = useState('All');
  const [priceMax, setPriceMax] = useState<number>(50000);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const amenitiesList = ['Wifi', 'Laundry', 'AC', 'Parking', 'Kitchen'];

  const filtered = listings.filter(l => {
    const categoryMatch = category === 'All' || l.roomType.toLowerCase() === category.toLowerCase();
    const priceMatch = l.rent <= priceMax;
    const amenitiesMatch = selectedAmenities.length === 0 || selectedAmenities.every(a => l.amenities?.includes(a));
    return categoryMatch && priceMatch && amenitiesMatch;
  });

  const toggleAmenity = (amenity: string) => {
    setSelectedAmenities(prev => prev.includes(amenity) ? prev.filter(a => a !== amenity) : [...prev, amenity]);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1 mb-2">
        <h2 className="text-4xl pro-heading tracking-tighter capitalize group flex items-center gap-3">
          Campus <span className="text-kjc-accent italic">Livings</span>
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
        </h2>
        <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.4em]">Verified Student Residences</p>
      </div>

      <div className="flex overflow-x-auto gap-3 pb-3 scrollbar-hide py-1">
        {['All', 'Single', 'Shared', '1BHK', 'PG'].map(f => (
          <button 
            key={f} 
            onClick={() => setCategory(f)}
            className={`px-8 py-4 rounded-[24px] border text-[10px] font-black whitespace-nowrap transition-all uppercase tracking-[0.2em] ${
              category === f ? 'bg-kjc-accent text-white border-kjc-accent shadow-lg shadow-kjc-accent/20' : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0, y: -20 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -20 }}
            className="overflow-hidden bg-white/5 rounded-[48px] border border-white/10 shadow-pro p-10 space-y-10"
          >
            <div className="space-y-5">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Budget Limit</span>
                  <p className="text-2xl font-display font-black text-white tracking-tighter">₹{priceMax.toLocaleString()}<span className="text-white/20 text-sm font-bold ml-2">/ month</span></p>
                </div>
                <button onClick={() => setPriceMax(50000)} className="text-[10px] font-black text-kjc-accent uppercase tracking-[0.2em] hover:opacity-80">Reset</button>
              </div>
              <input 
                type="range" min="1000" max="50000" step="500" value={priceMax}
                onChange={(e) => setPriceMax(parseInt(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-kjc-accent"
              />
            </div>

            <div className="space-y-6">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Essentials Required</label>
              <div className="flex flex-wrap gap-3">
                {amenitiesList.map(a => (
                  <button 
                    key={a} onClick={() => toggleAmenity(a)}
                    className={`px-6 py-4 rounded-2xl text-[10px] font-black border transition-all uppercase tracking-widest ${
                      selectedAmenities.includes(a) 
                        ? 'bg-kjc-accent text-white border-kjc-accent' 
                        : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="grid gap-6">
        {loading ? (
          [1,2].map(i => <div key={i} className="aspect-[16/10] bg-white/5 rounded-[48px] border border-white/10 animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-white/5 rounded-[48px] border border-dashed border-white/10">
             <div className="w-20 h-20 bg-white/5 rounded-[32px] flex items-center justify-center mx-auto mb-8 text-white/20">
                <Search size={32} />
             </div>
             <p className="text-white/30 font-black uppercase tracking-[0.3em] text-[10px]">No matches found in campus area</p>
             <button 
               onClick={() => { setCategory('All'); setPriceMax(50000); setSelectedAmenities([]); }}
               className="text-kjc-accent font-black text-[11px] mt-6 uppercase tracking-[0.3em] hover:opacity-80"
             >
               Reset Filters
             </button>
          </div>
        ) : (
          filtered.map((listing) => (
            <ListingCard key={listing.id} listing={listing} type="housing" onContact={onContact} />
          ))
        )}
      </div>
    </div>
  );
};

const MarketPage = ({ items, loading, onContact, showFilters, setShowFilters }: { items: MarketListing[], loading: boolean, onContact: any, showFilters: boolean, setShowFilters: (v: boolean) => void }) => {
  const [category, setCategory] = useState('All');
  const [priceMax, setPriceMax] = useState<number>(20000);
  const [condition, setCondition] = useState('All');

  const filtered = items.filter(l => {
    const categoryMatch = category === 'All' || l.category.toLowerCase() === category.toLowerCase();
    const priceMatch = l.price <= priceMax;
    const conditionMatch = condition === 'All' || l.condition === condition;
    return categoryMatch && priceMatch && conditionMatch;
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1 mb-2">
        <h2 className="text-4xl pro-heading tracking-tighter capitalize group flex items-center gap-3">
          Campus <span className="text-kjc-accent italic">Deals</span>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
        </h2>
        <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.4em]">Essentials By Students For Students</p>
      </div>

      <div className="flex overflow-x-auto gap-3 pb-3 scrollbar-hide py-1">
        {['All', 'Furniture', 'Electronics', 'Books'].map(f => (
          <button 
            key={f} 
            onClick={() => setCategory(f)}
            className={`px-8 py-4 rounded-[24px] border text-[10px] font-black whitespace-nowrap transition-all uppercase tracking-[0.2em] ${
              category === f ? 'bg-kjc-accent text-white border-kjc-accent shadow-lg shadow-kjc-accent/20' : 'bg-white/5 border-white/5 text-white/40 hover:border-white/20'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {showFilters && (
          <motion.div 
            initial={{ height: 0, opacity: 0, y: -20 }}
            animate={{ height: 'auto', opacity: 1, y: 0 }}
            exit={{ height: 0, opacity: 0, y: -20 }}
            className="overflow-hidden bg-white/5 rounded-[48px] border border-white/10 shadow-pro p-10 space-y-10"
          >
             <div className="space-y-5">
              <div className="flex justify-between items-end">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Budget Limit</span>
                  <p className="text-2xl font-display font-black text-white tracking-tighter">₹{priceMax.toLocaleString()}</p>
                </div>
                <button onClick={() => setPriceMax(20000)} className="text-[10px] font-black text-kjc-accent uppercase tracking-[0.2em]">Reset</button>
              </div>
              <input 
                type="range" min="100" max="20000" step="100" value={priceMax}
                onChange={(e) => setPriceMax(parseInt(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-kjc-accent"
              />
            </div>

            <div className="space-y-6">
              <label className="text-[10px] font-black uppercase tracking-[0.3em] text-white/30">Condition Requirement</label>
              <div className="flex flex-wrap gap-3">
                {['All', 'New', 'Used'].map(c => (
                  <button 
                    key={c} onClick={() => setCondition(c)}
                    className={`px-6 py-4 rounded-2xl text-[10px] font-black border transition-all uppercase tracking-widest ${
                      condition === c 
                        ? 'bg-kjc-accent text-white border-kjc-accent' 
                        : 'bg-white/5 text-white/40 border-white/5 hover:border-white/20'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="grid gap-6">
        {loading ? (
          [1,2].map(i => <div key={i} className="aspect-[16/10] bg-white/5 rounded-[48px] border border-white/10 animate-pulse" />)
        ) : filtered.length === 0 ? (
          <div className="text-center py-24 bg-white/5 rounded-[48px] border border-dashed border-white/10">
             <div className="w-20 h-20 bg-white/5 rounded-[32px] flex items-center justify-center mx-auto mb-8 text-white/20">
                <ShoppingBag size={32} />
             </div>
             <p className="text-white/30 font-black uppercase tracking-[0.3em] text-[10px]">Market is empty right now</p>
          </div>
        ) : (
          filtered.map((item) => (
            <ListingCard key={item.id} listing={item} type="market" onContact={onContact} />
          ))
        )}
      </div>
    </div>
  );
};

const CreateModal = ({ isOpen, onClose, onRefresh }: { isOpen: boolean, onClose: () => void, onRefresh: () => void }) => {
  const [selectedType, setSelectedType] = useState<'housing' | 'market' | null>(null);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-kjc-black/80 backdrop-blur-md"
          />
          <motion.div 
            initial={{ y: '100%', scale: 0.95 }}
            animate={{ y: 0, scale: 1 }}
            exit={{ y: '100%', scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative bg-kjc-black w-full max-w-lg rounded-t-[56px] sm:rounded-[56px] p-12 overflow-hidden border border-white/10 shadow-pro-lg"
          >
            {selectedType ? (
              <ListingForm 
                type={selectedType} 
                onClose={() => setSelectedType(null)} 
                onSuccess={() => {
                  onRefresh();
                  onClose();
                }} 
              />
            ) : (
              <>
                <div className="flex justify-between items-center mb-12">
                  <div className="space-y-1">
                    <h2 className="text-4xl pro-heading tracking-tighter">Post <span className="text-kjc-accent italic">Ad</span></h2>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">Verified Campus Listing</p>
                  </div>
                  <button onClick={onClose} className="w-14 h-14 bg-white/5 rounded-3xl flex items-center justify-center text-white/40 hover:text-white transition-all active:scale-90 border border-white/5">
                    <X size={28} />
                  </button>
                </div>
                
                <div className="grid grid-cols-2 gap-6">
                  <button 
                    onClick={() => setSelectedType('housing')}
                    className="group flex flex-col p-10 rounded-[48px] border border-white/5 bg-white/5 text-left hover:bg-kjc-accent/10 hover:border-kjc-accent transition-all duration-500"
                  >
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-8 group-hover:bg-kjc-accent shadow-lg shadow-kjc-accent/10 transition-all">
                      <Home size={28} />
                    </div>
                    <h3 className="pro-heading text-xl">Room</h3>
                    <p className="text-[10px] text-white/30 font-black uppercase mt-1 tracking-widest leading-none">PG & FLAT</p>
                  </button>
                  
                  <button 
                    onClick={() => setSelectedType('market')}
                    className="group flex flex-col p-10 rounded-[48px] border border-white/5 bg-white/5 text-left hover:bg-rose-500/10 hover:border-rose-500 transition-all duration-500"
                  >
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-white mb-8 group-hover:bg-rose-500 shadow-lg shadow-rose-500/10 transition-all">
                      <ShoppingBag size={28} />
                    </div>
                    <h3 className="pro-heading text-xl">Stuff</h3>
                    <p className="text-[10px] text-white/30 font-black uppercase mt-1 tracking-widest leading-none">BUY & SELL</p>
                  </button>
                </div>
                
                <div className="mt-12 pt-10 border-t border-white/5 flex items-center gap-6">
                  <div className="w-14 h-14 bg-kjc-accent/10 rounded-[24px] flex items-center justify-center text-kjc-accent border border-kjc-accent/20">
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <p className="text-sm pro-heading">Secure Marketplace</p>
                    <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em] leading-tight">Jayantians Protection Active</p>
                  </div>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default function Shell() {
  const [activeTab, setActiveTab] = useState<Tab>('rooms');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [verificationModalOpen, setVerificationModalOpen] = useState(false);
  const [housingData, setHousingData] = useState<HousingListing[]>([]);
  const [marketData, setMarketData] = useState<MarketListing[]>([]);
  const [savedData, setSavedData] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const { user, profile, signIn, logout } = useAuth();

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'rooms') {
        const data = await getHousingListings();
        setHousingData(data);
      } else if (activeTab === 'market') {
        const data = await getMarketListings();
        setMarketData(data);
      } else if (activeTab === 'saved') {
        if (!user) {
          setSavedData([]);
          setLoading(false);
          return;
        }
        const saved = await getSavedListings();
        const allHousing = await getHousingListings();
        const allMarket = await getMarketListings();
        
        const merged = saved.map(s => {
          const item = s.listingType === 'housing' 
            ? allHousing.find(h => h.id === s.listingId)
            : allMarket.find(m => m.id === s.listingId);
          return item ? { ...item, savedId: s.id, listingType: s.listingType } : null;
        }).filter(Boolean);
        
        setSavedData(merged);
      }
    } catch (err) {
      console.error('Error loading data:', err);
    }
    setLoading(false);
  };

  const handleContact = async (ownerId: string, listingId: string, title: string, type: string) => {
    if (!user) {
      await signIn();
      return;
    }
    try {
      const convId = await startConversation(ownerId, listingId, title, type);
      setActiveTab('messages');
    } catch (error) {
      console.error(error);
      alert(error instanceof Error ? error.message : 'Error starting chat');
    }
  };

  const getTitle = () => {
    switch(activeTab) {
      case 'rooms': return 'KJC Rooms';
      case 'market': return 'Campus Market';
      case 'saved': return 'Saved Items';
      case 'messages': return 'Messages';
      case 'profile': return 'Profile';
      default: return 'KJC Connect';
    }
  };

  const filterBySearch = (items: any[]) => {
    if (!searchQuery) return items;
    return items.filter(i => 
      i.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const renderLoginPrompt = () => (
    <div className="min-h-[60vh] flex flex-col items-center justify-center p-8 text-white relative font-sans">
      <div className="absolute top-[-10%] right-[-10%] w-[80%] max-w-sm aspect-square bg-kjc-accent/20 rounded-full blur-[120px] animate-pulse" />
      
      <div className="max-w-sm w-full text-center relative z-10 space-y-10">
        <div className="space-y-4">
          <div className="w-24 h-24 bg-gradient-to-br from-kjc-accent to-blue-600 rounded-[36px] mx-auto mb-6 flex items-center justify-center text-white shadow-[0_20px_50px_rgba(139,92,246,0.3)] ring-1 ring-white/20">
            <span className="text-4xl font-black">K</span>
          </div>
          <h2 className="text-4xl font-display tracking-tighter block mb-2">Auth <span className="text-kjc-accent italic">Required</span></h2>
          <p className="text-slate-400 text-[10px] leading-relaxed font-black uppercase tracking-[0.4em] opacity-80 block">
             Kristu Jayanti College
          </p>
        </div>
        
        <button 
          onClick={signIn}
          className="w-full bg-white text-kjc-black py-6 rounded-[32px] font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-4 hover:bg-kjc-slate-50 active:scale-[0.96] transition-all shadow-pro-lg relative overflow-hidden group"
        >
          Sign in with Campus Mail
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-kjc-black pb-32 atmo-bg">
      <Header 
        title={getTitle()} 
        activeTab={activeTab}
        onSearch={setSearchQuery} 
        onFilterClick={() => setShowFilters(!showFilters)} 
        showFilters={showFilters}
      />
      <main className="max-w-xl mx-auto px-6 py-12">
        {profile?.verifiedStatus !== 'verified' && activeTab !== 'profile' && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-12 p-[1.5px] bg-gradient-to-r from-kjc-accent to-blue-600 rounded-[48px] shadow-pro overflow-hidden"
          >
            <div className="bg-kjc-black/90 backdrop-blur-xl rounded-[47px] p-8 flex items-center justify-between gap-6">
              <div className="flex items-center gap-6">
                <div className="w-14 h-14 bg-kjc-accent/10 rounded-3xl flex items-center justify-center text-kjc-accent border border-kjc-accent/20">
                  <ShieldCheck size={30} />
                </div>
                <div>
                   <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40">Security Breach Prevention</p>
                   <p className="text-[12px] text-white font-bold tracking-tight mt-1">Identity Verification Required</p>
                </div>
              </div>
              <button 
                onClick={() => setVerificationModalOpen(true)}
                className="bg-white text-kjc-black px-8 py-4 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-white/90 active:scale-95 transition-all shadow-lg"
              >
                Verify
              </button>
            </div>
          </motion.div>
        )}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
          >
            {activeTab === 'rooms' && (
              <RoomsPage 
                listings={filterBySearch(housingData)} 
                loading={loading} 
                onContact={handleContact}
                showFilters={showFilters}
                setShowFilters={setShowFilters}
              />
            )}
            {activeTab === 'market' && (
              <MarketPage 
                items={filterBySearch(marketData)} 
                loading={loading} 
                onContact={handleContact}
                showFilters={showFilters}
                setShowFilters={setShowFilters}
              />
            )}
            
            {(!user && ['saved', 'messages', 'profile'].includes(activeTab)) ? renderLoginPrompt() : (
              <>
                {activeTab === 'saved' && (
              <div className="space-y-8">
                <div className="flex flex-col gap-1 mb-4">
                  <h2 className="text-4xl pro-heading tracking-tighter uppercase whitespace-nowrap">
                    Library <span className="text-kjc-accent italic">Saved</span>
                  </h2>
                  <p className="text-[10px] text-white/40 font-black uppercase tracking-[0.4em]">Your Private Collection</p>
                </div>
                {savedData.length === 0 ? (
                  <div className="text-center py-32 px-12 bg-white/5 rounded-[48px] border border-dashed border-white/10">
                    <div className="w-24 h-24 bg-white/5 rounded-[36px] mx-auto mb-8 flex items-center justify-center text-white/10">
                        <Bookmark size={40} strokeWidth={1} />
                    </div>
                    <p className="text-white/30 text-[10px] font-black uppercase tracking-[0.3em]">Vault is currently empty</p>
                  </div>
                ) : (
                  savedData.map(item => (
                    <ListingCard key={item.id} listing={item} type={item.listingType} onContact={handleContact} />
                  ))
                )}
              </div>
            )}
            {activeTab === 'messages' && <Chattery />}
            {activeTab === 'profile' && (
              <div className="space-y-10 pb-16">
                <div className="bg-white/5 border border-white/10 rounded-[56px] p-10 sm:p-12 relative overflow-hidden group shadow-pro-lg">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-kjc-accent/10 rounded-full blur-[100px] -translate-y-20 translate-x-20" />
                  <div className="relative z-10 flex flex-col items-center text-center">
                    <div className="relative mb-8">
                      <div className="absolute -inset-6 bg-gradient-to-tr from-kjc-accent to-blue-600 rounded-full blur-2xl opacity-20 group-hover:opacity-40 transition-opacity" />
                      <div className="w-32 h-32 rounded-[48px] bg-white/10 overflow-hidden ring-4 ring-white/10 shadow-2xl relative z-10 border border-white/20">
                         {profile?.photoURL ? (
                           <img src={profile.photoURL} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-kjc-navy to-kjc-accent flex items-center justify-center text-white text-4xl font-black italic">
                              {profile?.displayName?.charAt(0)}
                            </div>
                          )}
                      </div>
                    </div>
                    <h2 className="pro-heading text-4xl mb-3 tracking-tighter">{profile?.displayName}</h2>
                    <div className="flex flex-wrap justify-center gap-3 mt-2">
                       <span className="px-6 py-2.5 bg-white/5 text-white/60 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border border-white/5">{profile?.campusRole || 'Student'}</span>
                       {profile?.verifiedStatus === 'verified' ? (
                         <span className="px-6 py-2.5 bg-emerald-500/10 text-emerald-400 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border border-emerald-500/20 flex items-center gap-2">
                           <ShieldCheck size={14} strokeWidth={3} />
                           Verified
                         </span>
                       ) : (
                         <span className="px-6 py-2.5 bg-rose-500/10 text-rose-400 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] border border-rose-500/20">
                           Identity Restricted
                         </span>
                       )}
                    </div>
                  </div>
                </div>
                
                <div className="grid gap-6">
                  {[
                    { label: 'Asset Library', icon: Home, color: 'bg-indigo-500/10 text-indigo-400', sub: 'Posts you published', onClick: () => {
                      setActiveTab('rooms');
                      setSearchQuery(profile?.displayName || '');
                    } },
                    { label: 'Campus Map', icon: MapPin, color: 'bg-blue-500/10 text-blue-400', sub: 'KJC Campus Directions' },
                    { label: 'Privacy Vault', icon: ShieldCheck, color: 'bg-emerald-500/10 text-emerald-400', sub: 'Trusted Student Network' },
                    { label: 'System Pulse', icon: TrendingUp, color: 'bg-orange-500/10 text-orange-400', sub: 'Campus Analytics' }
                  ].map(item => (
                    <button 
                      key={item.label} 
                      onClick={(item as any).onClick}
                      className="w-full flex items-center gap-6 p-8 bg-white/5 border border-white/5 rounded-[48px] transition-all hover:bg-white/[0.08] hover:border-white/10 text-left group active:scale-[0.98]"
                    >
                      <div className={`w-16 h-16 rounded-[28px] flex items-center justify-center ${item.color} group-hover:scale-110 transition-transform shadow-lg border border-white/5`}>
                        <item.icon size={28} />
                      </div>
                      <div className="flex-1">
                        <p className="font-black text-white tracking-tighter text-xl">{item.label}</p>
                        <p className="text-[10px] text-white/30 font-black uppercase tracking-[0.2em] mt-1">{item.sub}</p>
                      </div>
                      <ChevronRight size={22} className="text-white/20 group-hover:translate-x-1 group-hover:text-kjc-accent transition-all" />
                    </button>
                  ))}
                </div>

                <div className="px-4">
                  <button 
                    onClick={logout}
                    className="w-full py-8 rounded-[48px] bg-rose-500/10 border border-rose-500/20 text-rose-500 text-[10px] font-black uppercase tracking-[0.5em] hover:bg-rose-500/20 transition-all flex items-center justify-center gap-4 active:scale-[0.96] shadow-xl shadow-rose-500/5 group"
                  >
                    Terminate Session
                    <ChevronRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-2 transition-all" />
                  </button>
                </div>
              </div>
            )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>
      
      <BottomNav 
        activeTab={activeTab} 
        onTabChange={setActiveTab} 
        onAddClick={() => {
          if (!user) {
            signIn();
          } else {
            setIsModalOpen(true);
          }
        }} 
      />

      <AnimatePresence>
        {isModalOpen && <CreateModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onRefresh={loadData} />}
      </AnimatePresence>

      <VerificationModal 
        isOpen={verificationModalOpen} 
        onClose={() => setVerificationModalOpen(false)} 
      />
    </div>
  );
}
