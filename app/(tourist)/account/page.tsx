'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/hooks/use-auth';
import { useFavorites } from '@/hooks/use-favorites';
import { useRecentlyViewed } from '@/hooks/use-recently-viewed';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { GlassCard } from '@/components/common/GlassCard';
import { AnimatedCounter } from '@/components/common/AnimatedCounter';
import { FloatingFAB } from '@/components/common/FloatingFAB';
import { getInitials } from '@/lib/utils';
import { ChevronDown, MapPin, Heart, Eye, Sparkles, Camera, User, Phone, CreditCard, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

const COUNTRIES = [
  'United States', 'Venezuela', 'Colombia', 'Brazil', 'Argentina', 'Mexico',
  'Spain', 'Canada', 'United Kingdom', 'Germany', 'France', 'Italy',
  'Portugal', 'Netherlands', 'Australia', 'Japan', 'Other',
];

const INTERESTS = [
  { value: 'beaches', label: 'Beaches', icon: '🏖️', image: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&h=300&fit=crop', personality: 'Beach Explorer' },
  { value: 'mountains', label: 'Mountains', icon: '⛰️', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=300&fit=crop', personality: 'Peak Seeker' },
  { value: 'adventure', label: 'Adventure', icon: '🧗', image: 'https://images.unsplash.com/photo-1530053969600-caed2596d242?w=400&h=300&fit=crop', personality: 'Thrill Chaser' },
  { value: 'culture', label: 'Culture', icon: '🏛️', image: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=400&h=300&fit=crop', personality: 'Culture Seeker' },
  { value: 'food', label: 'Food', icon: '🍽️', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400&h=300&fit=crop', personality: 'Gastro Explorer' },
  { value: 'nightlife', label: 'Nightlife', icon: '🌃', image: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=400&h=300&fit=crop', personality: 'Night Owl' },
  { value: 'family', label: 'Family', icon: '👨‍👩‍👧‍👦', image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&h=300&fit=crop', personality: 'Family Voyager' },
  { value: 'wellness', label: 'Wellness', icon: '🧘', image: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=400&h=300&fit=crop', personality: 'Zen Traveler' },
];

const COVER_IMAGES: Record<string, string> = {
  beaches: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=1400&h=400&fit=crop',
  mountains: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1400&h=400&fit=crop',
  adventure: 'https://images.unsplash.com/photo-1530053969600-caed2596d242?w=1400&h=400&fit=crop',
  culture: 'https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=1400&h=400&fit=crop',
  food: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1400&h=400&fit=crop',
  nightlife: 'https://images.unsplash.com/photo-1519608487953-e999c86e7455?w=1400&h=400&fit=crop',
  family: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=1400&h=400&fit=crop',
  wellness: 'https://images.unsplash.com/photo-1544161515-4ab6ce6db874?w=1400&h=400&fit=crop',
  default: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?w=1400&h=400&fit=crop',
};

interface UserProfile {
  display_name: string;
  phone: string;
  country: string;
  language: string;
  interests: string[];
  emergency_contact_name: string;
  emergency_contact_phone: string;
  payment_zelle_email: string;
  payment_usdt_address: string;
}

const EMPTY_PROFILE: UserProfile = {
  display_name: '', phone: '', country: '', language: 'en', interests: [],
  emergency_contact_name: '', emergency_contact_phone: '',
  payment_zelle_email: '', payment_usdt_address: '',
};

function AccordionSection({ title, icon, children, defaultOpen = false, delay = 0 }: {
  title: string; icon: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; delay?: number;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className="bg-white/70 dark:bg-gray-900/70 backdrop-blur-xl border border-white/30 dark:border-gray-700/30 rounded-2xl shadow-lg overflow-hidden"
    >
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center gap-3 p-5 text-left hover:bg-white/50 transition-colors"
        aria-expanded={isOpen}
      >
        <span className="text-muted-foreground">{icon}</span>
        <span className="font-semibold text-sm flex-1">{title}</span>
        <motion.div
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.3 }}
        >
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <div ref={contentRef} className="px-5 pb-5 space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function InterestCard({ interest, selected, onToggle }: {
  interest: typeof INTERESTS[0]; selected: boolean; onToggle: () => void;
}) {
  return (
    <motion.button
      type="button"
      onClick={onToggle}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className="relative rounded-xl overflow-hidden aspect-[4/3] group focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2"
      role="checkbox"
      aria-checked={selected}
      aria-label={interest.label}
    >
      <img
        src={interest.image}
        alt={interest.label}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
      />
      <div className={`absolute inset-0 transition-colors duration-300 ${
        selected ? 'bg-amber-500/40' : 'bg-black/40 group-hover:bg-black/30'
      }`} />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
        <span className="text-2xl mb-1">{interest.icon}</span>
        <span className="font-semibold text-sm">{interest.label}</span>
      </div>
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-2 right-2 w-6 h-6 bg-amber-400 rounded-full flex items-center justify-center"
        >
          <span className="text-white text-xs font-bold">✓</span>
        </motion.div>
      )}
    </motion.button>
  );
}

export default function AccountPage() {
  const { user, profile, loading, isAuthenticated } = useAuth();
  const { favorites } = useFavorites();
  const { items: recentlyViewed } = useRecentlyViewed();
  const [form, setForm] = useState<UserProfile>(EMPTY_PROFILE);
  const [initialForm, setInitialForm] = useState<UserProfile>(EMPTY_PROFILE);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [serviceAvailable, setServiceAvailable] = useState(true);

  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  useEffect(() => {
    if (!isAuthenticated) return;
    fetch('/api/profile')
      .then((r) => {
        if (r.status === 503) { setServiceAvailable(false); return null; }
        return r.json();
      })
      .then((data) => {
        if (!data?.profile) return;
        const p = data.profile;
        const loaded: UserProfile = {
          display_name: p.display_name ?? profile?.full_name ?? '',
          phone: p.phone ?? '',
          country: p.country ?? '',
          language: p.language ?? 'en',
          interests: p.interests ?? [],
          emergency_contact_name: p.emergency_contact_name ?? '',
          emergency_contact_phone: p.emergency_contact_phone ?? '',
          payment_zelle_email: p.payment_zelle_email ?? '',
          payment_usdt_address: p.payment_usdt_address ?? '',
        };
        setForm(loaded);
        setInitialForm(loaded);
      })
      .catch(() => setServiceAvailable(false));
  }, [isAuthenticated, profile]);

  const firstName = profile?.full_name?.split(' ')[0] ?? user?.email?.split('@')[0] ?? 'there';
  const displayName = form.display_name || profile?.full_name || 'Traveler';

  const toggleInterest = (value: string) => {
    setForm((f) => ({
      ...f,
      interests: f.interests.includes(value)
        ? f.interests.filter((i) => i !== value)
        : [...f.interests, value],
    }));
  };

  const handleSave = async () => {
    if (!serviceAvailable) return;
    setSaving(true);
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Save failed');
      setInitialForm(form);
      setSaved(true);
      toast.success('Profile saved!');
      setTimeout(() => setSaved(false), 2000);
    } catch {
      toast.error('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Determine cover photo from top interest
  const topInterest = form.interests[0] || 'default';
  const coverImage = COVER_IMAGES[topInterest] || COVER_IMAGES.default;

  // Travel personality
  const personality = form.interests.length > 0
    ? INTERESTS.find((i) => i.value === form.interests[0])
    : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          className="w-8 h-8 border-2 border-sky-500 border-t-transparent rounded-full"
        />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50/50 via-white to-amber-50/20">
      {/* Hero Section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        className="relative h-[280px] overflow-hidden"
      >
        <img
          src={coverImage}
          alt="Cover"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/70" />

        {/* Avatar + Info overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-3xl mx-auto flex items-end gap-4">
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              className="relative"
            >
              <div className="p-1 rounded-full bg-gradient-to-r from-sky-400 to-amber-400">
                <Avatar className="w-20 h-20 border-3 border-white">
                  <AvatarImage src={profile?.avatar_url || undefined} />
                  <AvatarFallback className="text-2xl bg-sky-500 text-white">
                    {getInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
              </div>
              <button
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full shadow-md flex items-center justify-center hover:bg-gray-50 transition-colors"
                aria-label="Change avatar"
              >
                <Camera className="w-3.5 h-3.5 text-gray-600" />
              </button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex-1 text-white"
            >
              <h1 className="text-2xl font-bold">{displayName}</h1>
              <p className="text-white/70 text-sm">
                {profile?.email} · <Badge variant="secondary" className="text-xs capitalize bg-white/20 text-white border-0">{profile?.role || 'Tourist'}</Badge>
              </p>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-3xl mx-auto px-4 -mt-4 relative z-10 pb-24">
        {/* Stats Bar */}
        <GlassCard className="p-4 mb-6">
          <div className="grid grid-cols-4 gap-4 text-center">
            <AnimatedCounter value={0} label="Trips" size="md" />
            <AnimatedCounter value={favorites.length} label="Saved" size="md" />
            <AnimatedCounter value={recentlyViewed.length} label="Viewed" size="md" />
            <AnimatedCounter value={form.interests.length} label="Interests" size="md" />
          </div>
        </GlassCard>

        {/* Travel Personality */}
        {personality && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="flex items-center gap-3 mb-6 px-1"
          >
            <Sparkles className="w-5 h-5 text-amber-400" />
            <div>
              <span className="font-semibold text-sm">{personality.icon} {personality.personality}</span>
              <span className="text-muted-foreground text-sm ml-2">
                based on your travel interests
              </span>
            </div>
          </motion.div>
        )}

        {!serviceAvailable && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mb-6 rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800"
          >
            Profile service is temporarily unavailable. Your changes cannot be saved right now.
          </motion.div>
        )}

        {/* Accordion Sections */}
        <div className="space-y-4">
        {/* Travel Interests (promoted to top, visual cards) */}
        <AccordionSection
          title="Travel Interests"
          icon={<Heart className="w-4 h-4" />}
          defaultOpen={true}
          delay={0.1}
        >
          {form.interests.length === 0 && (
            <p className="text-sm text-muted-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Pick your interests to get personalized recommendations
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {INTERESTS.map((interest) => (
              <InterestCard
                key={interest.value}
                interest={interest}
                selected={form.interests.includes(interest.value)}
                onToggle={() => toggleInterest(interest.value)}
              />
            ))}
          </div>
        </AccordionSection>

        {/* Personal Details */}
        <AccordionSection
          title="Personal Details"
          icon={<User className="w-4 h-4" />}
          delay={0.15}
        >
          <div>
            <label className="block text-sm font-medium mb-1">Display Name</label>
            <input
              type="text"
              value={form.display_name}
              onChange={(e) => setForm((f) => ({ ...f, display_name: e.target.value }))}
              placeholder={profile?.full_name ?? 'Your name'}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm bg-white/50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Phone / WhatsApp</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
              placeholder="+1 555 000 0000"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm bg-white/50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Country</label>
            <select
              value={form.country}
              onChange={(e) => setForm((f) => ({ ...f, country: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm bg-white/50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            >
              <option value="">Select country...</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Language</label>
            <div className="flex gap-2">
              {(['en', 'es'] as const).map((lang) => (
                <motion.button
                  key={lang}
                  type="button"
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setForm((f) => ({ ...f, language: lang }))}
                  className={`px-5 py-2 rounded-full text-sm font-medium border transition-all ${
                    form.language === lang
                      ? 'bg-sky-500 text-white border-sky-500 shadow-md'
                      : 'bg-white/70 text-muted-foreground border-gray-200 hover:border-sky-400'
                  }`}
                >
                  {lang === 'en' ? 'English' : 'Español'}
                </motion.button>
              ))}
            </div>
          </div>
        </AccordionSection>

        {/* Emergency Contact */}
        <AccordionSection
          title="Emergency Contact"
          icon={<Shield className="w-4 h-4" />}
          delay={0.2}
        >
          <div>
            <label className="block text-sm font-medium mb-1">Contact Name</label>
            <input
              type="text"
              value={form.emergency_contact_name}
              onChange={(e) => setForm((f) => ({ ...f, emergency_contact_name: e.target.value }))}
              placeholder="Full name"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm bg-white/50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Contact Phone</label>
            <input
              type="tel"
              value={form.emergency_contact_phone}
              onChange={(e) => setForm((f) => ({ ...f, emergency_contact_phone: e.target.value }))}
              placeholder="+1 555 000 0000"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm bg-white/50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            />
          </div>
        </AccordionSection>

        {/* Payment Methods */}
        <AccordionSection
          title="Payment Methods"
          icon={<CreditCard className="w-4 h-4" />}
          delay={0.25}
        >
          <div>
            <label className="block text-sm font-medium mb-1">Zelle Email</label>
            <input
              type="email"
              value={form.payment_zelle_email}
              onChange={(e) => setForm((f) => ({ ...f, payment_zelle_email: e.target.value }))}
              placeholder="email@example.com"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm bg-white/50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">USDT Wallet Address (TRC-20)</label>
            <input
              type="text"
              value={form.payment_usdt_address}
              onChange={(e) => setForm((f) => ({ ...f, payment_usdt_address: e.target.value }))}
              placeholder="T..."
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-mono bg-white/50 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-transparent transition-all"
            />
          </div>
        </AccordionSection>
        </div>
      </div>

      {/* Floating Save FAB */}
      <FloatingFAB
        onClick={handleSave}
        visible={isDirty && serviceAvailable}
        saving={saving}
        saved={saved}
      />
    </div>
  );
}
