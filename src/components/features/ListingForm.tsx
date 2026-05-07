import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Camera, MapPin, IndianRupee, Info, ChevronRight, ShieldCheck } from 'lucide-react';
import { createHousingListing } from '../../services/housingService';
import { createMarketListing } from '../../services/marketService';
import { useAuth } from '../../contexts/AuthContext';
import LocationSelector from './LocationSelector';

interface ListingFormProps {
  type: 'housing' | 'market';
  onClose: () => void;
  onSuccess: () => void;
}

export default function ListingForm({ type, onClose, onSuccess }: ListingFormProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<any>({
    title: '',
    roomType: 'single',
    category: 'Furniture',
    rent: '',
    price: '',
    deposit: '',
    maintenance: '',
    reasonForSelling: '',
    furnishing: 'Unfurnished',
    preferTenants: 'Any',
    isNegotiable: false,
    location: '',
    latitude: null,
    longitude: null,
    formattedAddress: '',
    distance: '',
    condition: 'Good',
    description: '',
  });

  const handleLocationSelect = (loc: { address: string, lat: number, lng: number }) => {
    setFormData({
      ...formData,
      formattedAddress: loc.address,
      latitude: loc.lat,
      longitude: loc.lng,
      location: loc.address.split(',')[0], // Use first part of address as short location
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (!formData.latitude || !formData.longitude) {
      alert("Please select a campus location on the map.");
      return;
    }

    setLoading(true);

    try {
      if (type === 'housing') {
        await createHousingListing({
          title: formData.title,
          description: formData.description,
          roomType: formData.roomType,
          rent: Number(formData.rent),
          deposit: Number(formData.deposit) || Number(formData.rent) * 2,
          maintenance: Number(formData.maintenance) || 0,
          furnishing: formData.furnishing,
          preferTenants: formData.preferTenants,
          location: formData.location || formData.formattedAddress.split(',')[0],
          latitude: formData.latitude,
          longitude: formData.longitude,
          formattedAddress: formData.formattedAddress,
          distance: formData.distance || '0.5 km',
          availableFrom: 'Immediately',
          genderPreference: 'none',
          amenities: [],
          photos: [],
          postedBy: user.uid,
          status: 'available'
        });
      } else {
        await createMarketListing({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          price: Number(formData.price),
          isNegotiable: formData.isNegotiable,
          reasonForSelling: formData.reasonForSelling,
          condition: formData.condition,
          latitude: formData.latitude,
          longitude: formData.longitude,
          formattedAddress: formData.formattedAddress,
          photos: [],
          postedBy: user.uid,
          status: 'available'
        });
      }
      onSuccess();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-kjc-black/80 backdrop-blur-md" onClick={onClose} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="relative bg-kjc-black w-full max-w-lg rounded-[56px] p-10 sm:p-12 shadow-pro-lg max-h-[90vh] overflow-y-auto border border-white/10 scrollbar-hide glass-card"
          >
            <div className="flex justify-between items-center mb-10 sticky top-0 bg-kjc-black/80 backdrop-blur-xl z-20 pb-4">
              <div className="flex flex-col">
                <h2 className="text-4xl pro-heading tracking-tighter">
                  {type === 'housing' ? 'Establish' : 'List'} <span className="text-kjc-accent italic">{type === 'housing' ? 'Post' : 'Item'}</span>
                </h2>
                <div className="flex gap-2.5 mt-3">
                  <span className="pro-badge bg-white/5 text-white/40 border-white/5 text-[8px] tracking-[0.3em]">EXCLUSIVELY KJC</span>
                  <div className="flex items-center gap-2 bg-emerald-500/10 px-3 py-1.5 rounded-full border border-emerald-500/20">
                    <ShieldCheck size={10} className="text-emerald-500" />
                    <span className="text-emerald-500 text-[8px] font-black uppercase tracking-widest">Vault Security</span>
                  </div>
                </div>
              </div>
              <button onClick={onClose} className="w-14 h-14 bg-white/5 rounded-3xl flex items-center justify-center text-white/20 hover:text-white transition-all active:scale-90 border border-white/5">
                <X size={24} />
              </button>
            </div>

            <div className="bg-white/5 p-8 rounded-[40px] mb-10 border border-white/5 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-kjc-accent/10 rounded-full blur-3xl -translate-y-10 translate-x-10" />
              <div className="relative z-10 flex items-start gap-6">
                <div className="w-14 h-14 bg-kjc-accent/20 rounded-[22px] flex items-center justify-center text-kjc-accent border border-kjc-accent/30 shadow-lg shadow-kjc-accent/10">
                  <Info size={24} strokeWidth={2.5} />
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.3em] text-white/80">Campus Integrity</p>
                  <p className="text-[11px] text-white/30 font-bold leading-relaxed mt-1 uppercase tracking-wider">Your listing is anchored to your verified university profile.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10 pb-4">
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 pl-4">Identification</label>
                <input 
                  required
                  value={formData.title}
                  onChange={e => setFormData({...formData, title: e.target.value})}
                  placeholder={type === 'housing' ? "Direct & clear title..." : "Brand, model, key feature..."}
                  className="input-pro"
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 pl-4">The Brief</label>
                <textarea 
                  required
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                  placeholder={type === 'housing' ? "Amenities, rules, specific location vibes..." : "Reason for sale, item condition details..."}
                  rows={4}
                  className="input-pro resize-none leading-relaxed py-6"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 pl-4">
                    {type === 'housing' ? 'Entity Type' : 'Classification'}
                  </label>
                  <div className="relative">
                    <select 
                      value={type === 'housing' ? formData.roomType : formData.category}
                      onChange={e => setFormData({...formData, [type === 'housing' ? 'roomType' : 'category']: e.target.value})}
                      className="input-pro appearance-none pr-12 text-[11px] font-black uppercase tracking-widest"
                    >
                      {type === 'housing' ? (
                        <>
                          <option value="single">Single Zone</option>
                          <option value="shared">Dual / Multiple</option>
                          <option value="1BHK">Private Flat</option>
                          <option value="PG">Campus PG</option>
                        </>
                      ) : (
                        <>
                          <option value="Furniture">Furniture</option>
                          <option value="Electronics">Tech Device</option>
                          <option value="Books">Study Kit</option>
                          <option value="Essentials">Daily Gear</option>
                        </>
                      )}
                    </select>
                    <ChevronRight size={16} className="absolute right-6 top-1/2 -translate-y-1/2 text-white/30 rotate-90" />
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 pl-4">
                    {type === 'housing' ? 'Monthly Cycle' : 'Equity Val'}
                  </label>
                  <div className="relative">
                    <IndianRupee size={16} className="absolute left-6 top-1/2 -translate-y-1/2 text-kjc-accent font-black" />
                    <input 
                      required
                      type="number"
                      value={type === 'housing' ? formData.rent : formData.price}
                      onChange={e => setFormData({...formData, [type === 'housing' ? 'rent' : 'price']: e.target.value})}
                      className="input-pro pl-12 font-display font-black text-lg"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 pl-4">Coordinate Lock</label>
                <div className="bg-white/[0.03] rounded-[40px] p-2 border border-white/5">
                  <LocationSelector onLocationSelect={handleLocationSelect} />
                </div>
              </div>

              <div className="space-y-4">
                 <label className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 pl-4">Visual Data</label>
                 <button type="button" className="w-full h-32 bg-white/5 border-2 border-dashed border-white/10 rounded-[40px] flex flex-col items-center justify-center text-white/20 hover:border-kjc-accent/30 hover:text-kjc-accent hover:bg-white/[0.08] group transition-all duration-300">
                    <Camera size={40} strokeWidth={1} className="mb-2 group-hover:scale-110 transition-transform duration-500" />
                    <span className="text-[9px] font-black uppercase tracking-[0.4em]">Initialize Upload</span>
                 </button>
              </div>

              <button 
                type="submit"
                disabled={loading}
                className="w-full bg-kjc-accent text-white py-8 rounded-[40px] font-black uppercase tracking-[0.4em] text-[10px] hover:bg-kjc-accent/90 active:scale-[0.98] transition-all shadow-[0_20px_50px_rgba(139,92,246,0.2)] disabled:opacity-40 disabled:grayscale mt-8"
              >
                {loading ? 'Transmitting...' : 'Establish Secure Post'}
              </button>
            </form>
          </motion.div>
    </div>
  );
}
