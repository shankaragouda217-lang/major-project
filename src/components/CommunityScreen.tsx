import { useState, useMemo } from 'react';
import { Plus, Minus, ShoppingCart, CheckCircle, Search, Filter, X, ArrowRight, Zap, ShoppingBag, Users, Store, MapPin, Clock, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useApp } from '../AppContext';
import { formatDistanceToNow } from 'date-fns';

const MARKET_PRODUCTS = [
  {
    id: 'p1',
    name: 'Organic Desi Tomato Seeds',
    price: 99,
    category: 'Seeds',
    image: 'https://picsum.photos/seed/tomato-seeds-pack/400/300',
    description: 'High-yield, non-GMO heirloom tomato seeds perfect for Indian climate.',
    rating: 4.8,
    reviews: 124
  },
  {
    id: 'p2',
    name: 'Premium Cocopeat Block (5kg)',
    price: 249,
    category: 'Soil',
    image: 'https://picsum.photos/seed/cocopeat-block/400/300',
    description: 'Enriched with organic compost and perlite for optimal drainage.',
    rating: 4.9,
    reviews: 89
  },
  {
    id: 'p3',
    name: 'Neem Cake Powder (1kg)',
    price: 180,
    category: 'Nutrients',
    image: 'https://picsum.photos/seed/neem-powder/400/300',
    description: 'Concentrated natural fertilizer to boost plant immunity and growth.',
    rating: 4.7,
    reviews: 56
  },
  {
    id: 'p4',
    name: 'Terracotta Self-Watering Pot',
    price: 450,
    category: 'Equipment',
    image: 'https://picsum.photos/seed/terracotta-pot/400/300',
    description: 'Traditional design with water level indicator. Ideal for busy urban farmers.',
    rating: 4.6,
    reviews: 210
  },
  {
    id: 'p5',
    name: 'Organic Neem Oil Spray',
    price: 120,
    category: 'Protection',
    image: 'https://picsum.photos/seed/garden-spray/400/300',
    description: '100% organic cold-pressed neem oil for natural pest control.',
    rating: 4.5,
    reviews: 45
  },
  {
    id: 'p6',
    name: 'Kitchen Garden Starter Kit',
    price: 899,
    category: 'Kits',
    image: 'https://picsum.photos/seed/garden-kit/400/300',
    description: 'Includes seeds for Tulsi, Coriander, and Chilli, plus pots and soil.',
    rating: 4.9,
    reviews: 312
  },
  {
    id: 'p7',
    name: 'Fresh Coconut Saplings (Hybrid)',
    price: 350,
    category: 'Plants',
    image: 'https://picsum.photos/seed/coconut-sapling/400/300',
    description: 'Dwarf hybrid coconut saplings for high yield and early fruiting.',
    rating: 4.8,
    reviews: 78
  },
  {
    id: 'p8',
    name: 'Coconut Husk Chips (2kg)',
    price: 150,
    category: 'Mulch',
    image: 'https://picsum.photos/seed/coconut-chips/400/300',
    description: 'Excellent for moisture retention and orchid growing.',
    rating: 4.7,
    reviews: 34
  },
  {
    id: 'p9',
    name: 'Vermicompost (10kg)',
    price: 320,
    category: 'Soil',
    image: 'https://picsum.photos/seed/compost-soil/400/300',
    description: 'Pure earthworm compost for nutrient-rich soil.',
    rating: 4.9,
    reviews: 156
  },
  {
    id: 'p10',
    name: 'Hybrid Papaya Seeds (Red Lady)',
    price: 149,
    category: 'Seeds',
    image: 'https://picsum.photos/seed/papaya-seeds/400/300',
    description: 'High-quality hybrid papaya seeds for sweet and large fruits.',
    rating: 4.7,
    reviews: 92
  },
  {
    id: 'p11',
    name: 'Kesar Mango Sapling',
    price: 499,
    category: 'Plants',
    image: 'https://picsum.photos/seed/mango-tree/400/300',
    description: 'Authentic Kesar mango grafted sapling for your home garden.',
    rating: 4.9,
    reviews: 64
  },
  {
    id: 'p12',
    name: 'Green Chilli Seeds (Teja)',
    price: 75,
    category: 'Seeds',
    image: 'https://picsum.photos/seed/chilli-plant/400/300',
    description: 'Spicy and high-yielding green chilli seeds.',
    rating: 4.6,
    reviews: 110
  },
  {
    id: 'p13',
    name: 'Garden Trowel & Rake Set',
    price: 299,
    category: 'Equipment',
    image: 'https://picsum.photos/seed/garden-tools/400/300',
    description: 'Durable metal tools with ergonomic wooden handles.',
    rating: 4.8,
    reviews: 145
  },
  {
    id: 'p14',
    name: 'Panchagavya Organic Liquid',
    price: 220,
    category: 'Nutrients',
    image: 'https://picsum.photos/seed/liquid-fertilizer/400/300',
    description: 'Traditional Indian organic growth promoter and pesticide.',
    rating: 4.9,
    reviews: 230
  }
];

export default function CommunityScreen() {
  const { t, reports } = useApp();
  const [activeTab, setActiveTab] = useState<'feed' | 'shop'>('feed');
  const [cart, setCart] = useState<{ [id: string]: number }>({});
  const [showCheckoutSuccess, setShowCheckoutSuccess] = useState(false);
  const [showCartOverlay, setShowCartOverlay] = useState(false);
  const [showPaymentSelection, setShowPaymentSelection] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredProducts = useMemo(() => {
    return MARKET_PRODUCTS.filter(p => 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const addToCart = (productId: string) => {
    setCart(prev => ({
      ...prev,
      [productId]: (prev[productId] || 0) + 1
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => {
      const newCart = { ...prev };
      if (newCart[productId] > 1) {
        newCart[productId] -= 1;
      } else {
        delete newCart[productId];
      }
      return newCart;
    });
  };

  const cartItemsCount = Object.values(cart).reduce((sum, count) => sum + count, 0);
  const cartTotal = Object.entries(cart).reduce((sum, [id, count]) => {
    const product = MARKET_PRODUCTS.find(p => p.id === id);
    return sum + (product?.price || 0) * count;
  }, 0);

  const handlePlaceOrderClick = () => {
    setShowCartOverlay(false);
    setShowPaymentSelection(true);
  };

  const handleFinalCheckout = () => {
    setShowPaymentSelection(false);
    setShowCheckoutSuccess(true);
    setCart({});
    setPaymentMethod(null);
    setTimeout(() => setShowCheckoutSuccess(false), 3000);
  };

  return (
    <div className="pb-24">
      <header className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-zinc-900 uppercase">
              {activeTab === 'shop' ? t('agri_shop') : 'Community'}
            </h1>
            <p className="text-zinc-500 font-medium">
              {activeTab === 'shop' ? t('agri_shop_subtitle') : 'Real-time updates from local farmers'}
            </p>
          </div>
          <div className="flex gap-2">
            {activeTab === 'shop' && cartItemsCount > 0 && (
              <button 
                onClick={() => setShowCartOverlay(true)}
                className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center relative shadow-lg shadow-emerald-200"
              >
                <ShoppingCart size={20} />
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
                  {cartItemsCount}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-zinc-100 p-1 rounded-2xl">
          <button 
            onClick={() => setActiveTab('feed')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'feed' ? 'bg-white text-emerald-600 shadow-sm' : 'text-zinc-500'}`}
          >
            <Users size={18} /> Feed
          </button>
          <button 
            onClick={() => setActiveTab('shop')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === 'shop' ? 'bg-white text-emerald-600 shadow-sm' : 'text-zinc-500'}`}
          >
            <Store size={18} /> Shop
          </button>
        </div>
      </header>

      <AnimatePresence mode="wait">
        {activeTab === 'feed' ? (
          <motion.div
            key="feed"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="space-y-6"
          >
            {reports.length === 0 ? (
              <div className="text-center py-20 bg-zinc-50 rounded-[40px] border-2 border-dashed border-zinc-200">
                <Users className="mx-auto text-zinc-300 mb-4" size={48} />
                <p className="text-zinc-500 font-bold">No community reports yet</p>
                <p className="text-zinc-400 text-xs mt-1">Be the first to share your plant's health!</p>
              </div>
            ) : (
              reports.map((report) => (
                <motion.div 
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white border-2 border-zinc-100 rounded-[32px] overflow-hidden shadow-sm"
                >
                  <div className="p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600 font-bold">
                          {report.userName.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-zinc-900 text-sm">{report.userName}</h4>
                          <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-bold uppercase tracking-widest">
                            <MapPin size={10} /> {report.location}
                            <span className="mx-1">•</span>
                            <Clock size={10} /> {formatDistanceToNow(report.timestamp)} ago
                          </div>
                        </div>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                        report.status === 'Healthy' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {report.status}
                      </div>
                    </div>
                    
                    <h3 className="font-bold text-zinc-900 mb-2">{report.plantName}</h3>
                    <p className="text-sm text-zinc-600 leading-relaxed mb-4">
                      {report.description}
                    </p>

                    {report.image && (
                      <div className="aspect-video rounded-2xl overflow-hidden mb-4">
                        <img src={report.image} alt="" className="w-full h-full object-cover" />
                      </div>
                    )}

                    <div className="flex items-center gap-2 p-3 bg-zinc-50 rounded-2xl">
                      <AlertTriangle size={16} className="text-orange-500" />
                      <p className="text-[11px] text-zinc-500 font-medium">
                        Reported as a potential threat to nearby {report.plantName} crops.
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </motion.div>
        ) : (
          <motion.div
            key="shop"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Shop Search & Filter */}
            <div className="flex gap-3 mb-8">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                <input 
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={t('search_shop_placeholder')}
                  className="w-full bg-white border-2 border-zinc-100 rounded-2xl pl-12 pr-4 py-3 text-sm focus:border-emerald-600 outline-none transition-all"
                />
              </div>
              <button className="w-12 h-12 bg-white border-2 border-zinc-100 rounded-2xl flex items-center justify-center text-zinc-600">
                <Filter size={20} />
              </button>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-2 gap-4">
              {filteredProducts.map((product) => (
                <motion.div 
                  key={product.id}
                  whileHover={{ y: -5 }}
                  className="bg-white border-2 border-zinc-100 rounded-3xl overflow-hidden group"
                >
                  <div className="aspect-[4/3] relative overflow-hidden">
                    <img 
                      src={product.image} 
                      alt={product.name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3">
                      <span className="bg-white/90 backdrop-blur-sm px-2 py-1 rounded-lg text-[9px] font-bold uppercase tracking-widest text-zinc-900">
                        {product.category}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-bold text-zinc-900 text-sm mb-1 line-clamp-1">{product.name}</h3>
                    <p className="text-[10px] text-zinc-500 line-clamp-2 mb-3 leading-tight h-6">
                      {product.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-lg font-black text-emerald-600">₹{product.price}</span>
                      
                      {cart[product.id] ? (
                        <div className="flex items-center gap-2 bg-zinc-100 rounded-xl px-2 py-1">
                          <button 
                            onClick={() => removeFromCart(product.id)}
                            className="text-zinc-600 hover:text-red-500"
                          >
                            <Minus size={14} />
                          </button>
                          <span className="text-xs font-bold w-4 text-center">{cart[product.id]}</span>
                          <button 
                            onClick={() => addToCart(product.id)}
                            className="text-zinc-600 hover:text-emerald-600"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => addToCart(product.id)}
                          className="w-8 h-8 bg-zinc-900 text-white rounded-xl flex items-center justify-center active:scale-90 transition-transform"
                        >
                          <Plus size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-20">
                <Search className="mx-auto text-zinc-200 mb-4" size={48} />
                <p className="text-zinc-400 font-medium">{t('no_products_found')}</p>
              </div>
            )}

            {/* Floating View Cart Button (Swiggy Style) */}
            <AnimatePresence>
              {cartItemsCount > 0 && !showCartOverlay && !showPaymentSelection && (
                <motion.div 
                  initial={{ y: 100 }}
                  animate={{ y: 0 }}
                  exit={{ y: 100 }}
                  className="fixed bottom-24 left-6 right-6 z-40"
                >
                  <button 
                    onClick={() => setShowCartOverlay(true)}
                    className="w-full bg-emerald-600 text-white p-4 rounded-2xl shadow-2xl flex items-center justify-between font-bold"
                  >
                    <div className="flex items-center gap-3">
                      <div className="bg-emerald-500 p-2 rounded-lg">
                        <ShoppingCart size={18} />
                      </div>
                      <div className="text-left">
                        <p className="text-[10px] uppercase tracking-widest opacity-80">{cartItemsCount} {t('items')}</p>
                        <p className="text-sm">₹{cartTotal}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span>{t('view_cart')}</span>
                      <ArrowRight size={18} />
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Cart Overlay (Swiggy Style) */}
            <AnimatePresence>
              {showCartOverlay && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[100] bg-zinc-900/40 backdrop-blur-sm flex items-end"
                >
                  <motion.div 
                    initial={{ y: '100%' }}
                    animate={{ y: 0 }}
                    exit={{ y: '100%' }}
                    className="bg-white w-full rounded-t-[40px] p-8 max-h-[80vh] overflow-y-auto"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter">{t('your_cart')}</h2>
                      <button 
                        onClick={() => setShowCartOverlay(false)}
                        className="w-10 h-10 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <div className="space-y-4 mb-8">
                      {Object.entries(cart).map(([id, count]) => {
                        const product = MARKET_PRODUCTS.find(p => p.id === id);
                        if (!product) return null;
                        return (
                          <div key={id} className="flex items-center justify-between bg-zinc-50 p-4 rounded-2xl">
                            <div className="flex items-center gap-4">
                              <img src={product.image} className="w-12 h-12 rounded-xl object-cover" alt="" />
                              <div>
                                <h4 className="font-bold text-sm text-zinc-900">{product.name}</h4>
                                <p className="text-xs text-zinc-500">₹{product.price} x {count}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3 bg-white border border-zinc-100 rounded-xl px-3 py-1">
                              <button onClick={() => removeFromCart(id)} className="text-zinc-400 hover:text-red-500"><Minus size={14} /></button>
                              <span className="text-sm font-bold">{count}</span>
                              <button onClick={() => addToCart(id)} className="text-zinc-400 hover:text-emerald-600"><Plus size={14} /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className="border-t border-zinc-100 pt-6 mb-8">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-zinc-500">{t('subtotal')}</span>
                        <span className="font-bold">₹{cartTotal}</span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-zinc-500">{t('delivery_fee')}</span>
                        <span className="font-bold text-emerald-600">{t('free')}</span>
                      </div>
                      <div className="flex justify-between items-center pt-4 border-t border-zinc-100">
                        <span className="text-lg font-black text-zinc-900 uppercase">{t('total')}</span>
                        <span className="text-xl font-black text-emerald-600">₹{cartTotal}</span>
                      </div>
                    </div>

                    <button 
                      onClick={handlePlaceOrderClick}
                      className="w-full bg-zinc-900 text-white font-bold py-5 rounded-2xl shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      {t('place_order')} <ArrowRight size={20} />
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Payment Selection Overlay */}
            <AnimatePresence>
              {showPaymentSelection && (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[110] bg-zinc-900/40 backdrop-blur-sm flex items-center justify-center p-6"
                >
                  <motion.div 
                    initial={{ scale: 0.9 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0.9 }}
                    className="bg-white w-full max-w-sm rounded-[40px] p-8 shadow-2xl"
                  >
                    <div className="flex justify-between items-center mb-6">
                      <h2 className="text-2xl font-black text-zinc-900 uppercase tracking-tighter">{t('payment_method')}</h2>
                      <button 
                        onClick={() => setShowPaymentSelection(false)}
                        className="w-8 h-8 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-500"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="space-y-4 mb-8">
                      <button 
                        onClick={() => setPaymentMethod('online')}
                        className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${paymentMethod === 'online' ? 'border-emerald-600 bg-emerald-50' : 'border-zinc-100 hover:border-zinc-200'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentMethod === 'online' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                            <Zap size={20} />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-sm text-zinc-900">{t('pay_online')}</p>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{t('upi_cards_netbanking')}</p>
                          </div>
                        </div>
                        {paymentMethod === 'online' && <CheckCircle size={20} className="text-emerald-600" />}
                      </button>

                      <button 
                        onClick={() => setPaymentMethod('cod')}
                        className={`w-full p-4 rounded-2xl border-2 flex items-center justify-between transition-all ${paymentMethod === 'cod' ? 'border-emerald-600 bg-emerald-50' : 'border-zinc-100 hover:border-zinc-200'}`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentMethod === 'cod' ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-500'}`}>
                            <ShoppingBag size={20} />
                          </div>
                          <div className="text-left">
                            <p className="font-bold text-sm text-zinc-900">{t('cod')}</p>
                            <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-widest">{t('pay_on_receive')}</p>
                          </div>
                        </div>
                        {paymentMethod === 'cod' && <CheckCircle size={20} className="text-emerald-600" />}
                      </button>
                    </div>

                    <button 
                      onClick={handleFinalCheckout}
                      disabled={!paymentMethod}
                      className="w-full bg-zinc-900 text-white font-bold py-5 rounded-2xl shadow-xl active:scale-95 transition-all disabled:opacity-50"
                    >
                      {t('confirm_order')}
                    </button>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Checkout Success Overlay */}
            <AnimatePresence>
              {showCheckoutSuccess && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="fixed inset-0 z-[120] flex items-center justify-center p-6 bg-zinc-900/40 backdrop-blur-sm"
                >
                  <div className="bg-white rounded-[40px] p-10 text-center max-w-xs w-full shadow-2xl">
                    <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                      <CheckCircle size={48} />
                    </div>
                    <h2 className="text-2xl font-black text-zinc-900 mb-2 uppercase tracking-tighter">{t('order_placed')}</h2>
                    <p className="text-zinc-500 text-sm mb-8">{t('order_success_msg')}</p>
                    <button 
                      onClick={() => setShowCheckoutSuccess(false)}
                      className="w-full bg-zinc-900 text-white font-bold py-4 rounded-2xl shadow-xl active:scale-95 transition-all"
                    >
                      {t('great')}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
