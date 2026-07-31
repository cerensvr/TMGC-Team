import { Product, ProductDraft } from '../types';
import { errorDev } from './logger';
import { productService } from './productService';

const TARGET_EMAIL = 'cerensivri06@gmail.com';

type ShelfImportItem = {
  product: ProductDraft;
  matches: (product: Product) => boolean;
  keepCanonicalName?: boolean;
};

const normalize = (value = '') =>
  value
    .toLocaleLowerCase('tr-TR')
    .replace(/[^a-z0-9çğıöşü+]+/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const hasTerms = (product: Product, brand: string, terms: string[]) => {
  const text = normalize(`${product.brand} ${product.name}`);
  return text.includes(normalize(brand)) && terms.every(term => text.includes(normalize(term)));
};

const shelfItems: ShelfImportItem[] = [
  {
    matches: product => hasTerms(product, 'La Roche-Posay', ['Effaclar', 'Duo']),
    product: {
      name: 'Effaclar Duo+M 40 ml',
      brand: 'La Roche-Posay',
      category: 'Nemlendirici',
      timeOfDay: 'both',
      imageUrl: '',
      cutoutImageUrl: 'local:la-roche-posay-effaclar-duo-m',
      description:
        'Yağlı ve akneye eğilimli ciltlerde cilt kusuru görünümünü azaltmaya ve cilt bariyerini desteklemeye yardımcı bakım kremi.\n\nKullanım: Sabah ve/veya akşam, temiz cilde fındık büyüklüğünde uygulayın. Tüm yüze yayın ve göz çevresinden kaçının.\n\nİçindekiler (INCI): Aqua / Water / Eau, Glycerin, Dimethicone, Isocetyl Stearate, Niacinamide, Isopropyl Lauroyl Sarcosinate, Silica, Ammonium Polyacryloyldimethyl Taurate, Oryza Sativa Starch / Rice Starch, Punica Granatum Pericarp Extract, Potassium Cetyl Phosphate, Sorbitan Oleate, Zinc PCA, Glyceryl Stearate SE, Isohexadecane, Sodium Hydroxide, Myristyl Myristate, 2-Oleamido-1,3-Octadecanediol, Mannose, Poloxamer 338, Propanediol, Hydroxyethoxyphenyl Butanone, Capryloyl Salicylic Acid, Caprylyl Glycol, Vitreoscilla Ferment, Citric Acid, Trisodium Ethylenediaminedisuccinate, Maltodextrin, Xanthan Gum, Pentylene Glycol, Polysorbate 80, Acrylamide/Sodium Acryloyldimethyltaurate Copolymer, Salicylic Acid, Piroctone Olamine, Parfum / Fragrance.',
      activeIngredients: ['Phylobioma', 'Procerad', 'Niasinamid', 'Çinko PCA', 'Salisilik Asit', 'LHA'],
      isFavorite: false,
      isActive: true,
    },
  },
  {
    matches: product => hasTerms(product, 'CeraVe', ['Köpüren', 'Temizleyici']),
    keepCanonicalName: true,
    product: {
      name: 'Köpüren Temizleyici',
      brand: 'CeraVe',
      category: 'Temizleyici',
      timeOfDay: 'both',
      imageUrl: '',
      cutoutImageUrl: 'local:cerave-kopuren-temizleyici',
      description:
        'Normal ve yağlı ciltler için, cildin koruyucu bariyerine zarar vermeden kiri ve fazla yağı arındırmaya yardımcı parfümsüz köpüren temizleme jeli. Yüz ve vücut kullanımına uygundur.\n\nKullanım: Cildi ılık suyla ıslatın, ürünü nazik dairesel hareketlerle masaj yaparak uygulayın ve durulayın.\n\nİçindekiler (INCI): Aqua / Water, Cocamidopropyl Hydroxysultaine, Glycerin, Sodium Lauroyl Sarcosinate, Propanediol, PEG-150 Pentaerythrityl Tetrastearate, Niacinamide, PEG-6 Caprylic/Capric Glycerides, Ceramide NP, Ceramide AP, Ceramide EOP, Carbomer, Sodium Methyl Cocoyl Taurate, Sodium Benzoate, Sodium Chloride, Sodium Lauroyl Lactylate, Sodium Hyaluronate, Cholesterol, Phenoxyethanol, Disodium EDTA, Citric Acid, Tetrasodium EDTA, Phytosphingosine, Xanthan Gum, Ethylhexylglycerin.',
      activeIngredients: ['3 Temel Seramid', 'Niasinamid', 'Hyalüronik Asit', 'Fitospingozin'],
      isFavorite: false,
      isActive: true,
    },
  },
  {
    matches: product => hasTerms(product, 'La Roche-Posay', ['UVAir']),
    product: {
      name: 'Anthelios UVAir SPF50+ 40 ml',
      brand: 'La Roche-Posay',
      category: 'Güneş Kremi',
      timeOfDay: 'morning',
      imageUrl: '',
      cutoutImageUrl: 'local:anthelios-uvair-spf50',
      description:
        'Hava kadar hafif yapıda, SPF50+ çok yüksek koruma sunan günlük yüz güneş koruyucusu.\n\nKullanım: Güneşe çıkmadan yaklaşık 20 dakika önce, cilt bakımının son adımı olarak yüz, boyun ve açıkta kalan bölgelere iki parmak kuralıyla uygulayın. Korumanın devamı için düzenli olarak yenileyin.\n\nİçindekiler (INCI): Aqua / Water / Eau, Alcohol Denat., Diisopropyl Sebacate, Dicaprylyl Carbonate, Bis-Ethylhexyloxyphenol Methoxyphenyl Triazine, Ethylhexyl Triazone, Butyl Methoxydibenzoylmethane, Isopropyl Myristate, Glycerin, Silica, Propylene Glycol Dicaprylate/Dicaprate, Potassium Cetyl Phosphate, Copernicia Cerifera Cera / Carnauba Wax, Diethylamino Hydroxybenzoyl Hexyl Benzoate, Acrylates/C10-30 Alkyl Acrylate Crosspolymer, Chlorphenesin, Citric Acid, Glyceryl Stearate, Hydroxyacetophenone, Myristic Acid, Niacinamide, Palmitic Acid, PEG-100 Stearate, Pentylene Glycol, Perlite, Silica Silylate, Sodium Hyaluronate, Stearic Acid, Tocopherol, Triethanolamine, Trisodium Ethylenediamine Disuccinate, Xanthan Gum, Parfum / Fragrance.',
      activeIngredients: ['UV Filtreleri', 'Hyalüronik Asit', 'Niasinamid', 'E Vitamini'],
      isFavorite: false,
      isActive: true,
    },
  },
  {
    matches: product => hasTerms(product, 'La Roche-Posay', ['Mela B3', 'Serum']),
    product: {
      name: 'Mela B3 Serum 30 ml',
      brand: 'La Roche-Posay',
      category: 'Serum',
      timeOfDay: 'both',
      imageUrl: '',
      cutoutImageUrl: 'local:la-roche-posay-mela-b3-serum',
      description:
        'Cilt tonunu eşitlemeye ve koyu leke görünümünü azaltmaya yardımcı yoğun bakım serumu.\n\nKullanım: Sabah ve/veya akşam temizlenmiş yüz, boyun ve dekolte bölgesine 2-3 damla uygulayın. Tek başına ya da nemlendiricinin altında kullanılabilir.\n\nİçindekiler (INCI): Aqua / Water / Eau, Dimethicone, Niacinamide, Glycerin, Propylene Glycol, Polysilicone-11, Silica, Bis-PEG/PPG-16/16 PEG/PPG-16/16 Dimethicone, Cystoseira Tamariscifolia Extract, 2-Mercaptonicotinoyl Glycine, PEG-20 Methyl Glucose Sesquistearate, Sodium Hyaluronate, Sodium Hydroxide, Sodium Thiosulfate, Carnosine, Poloxamer 338, Ammonium Polyacryloyldimethyl Taurate, Dipotassium Glycyrrhizate, Caprylic/Capric Triglyceride, Capryloyl Salicylic Acid, Caprylyl Glycol, Citric Acid, Trisodium Ethylenediamine Disuccinate, Xanthan Gum, Pentylene Glycol, Octyldodecanol, Retinyl Palmitate, Tocopherol, Pentaerythrityl Tetra-Di-T-Butyl Hydroxyhydrocinnamate, Phenoxyethanol, CI 17200 / Red 33, Parfum / Fragrance.',
      activeIngredients: ['Melasyl', '%10 Niasinamid', 'Hyalüronik Asit', 'LHA', 'Retinyl Palmitat', 'E Vitamini'],
      isFavorite: false,
      isActive: true,
    },
  },
  {
    matches: product =>
      hasTerms(product, 'La Roche-Posay', ['Mela B3']) &&
      ['cleanser', 'temizleme', 'temizleyici', 'jel'].some(term => normalize(product.name).includes(normalize(term))),
    product: {
      name: 'Mela B3 Koyu Leke Karşıtı Temizleme Jeli 200 ml',
      brand: 'La Roche-Posay',
      category: 'Temizleyici',
      timeOfDay: 'both',
      imageUrl: '',
      cutoutImageUrl: 'local:la-roche-posay-mela-b3-cleanser',
      description:
        'Koyu leke görünümüne karşı geliştirilen, cildi arındırmaya ve daha eşit tonlu bir görünümü desteklemeye yardımcı temizleme jeli.\n\nKullanım: Sabah ve/veya akşam az miktarda ürünü nemli yüz, boyun, dekolte veya ellere dairesel hareketlerle uygulayın ve durulayın.\n\nİçindekiler (INCI): Aqua / Water, Glycerin, Myristic Acid, Potassium Hydroxide, Glyceryl Stearate SE, Stearic Acid, Lauric Acid, Palmitic Acid, Coco-Glucoside, Capryloyl Salicylic Acid, Tetrasodium EDTA, Parfum / Fragrance.',
      activeIngredients: ['Melasyl', 'Niasinamid', 'PHA', 'LHA'],
      isFavorite: false,
      isActive: true,
    },
  },
  {
    matches: product => hasTerms(product, 'La Roche-Posay', ['Cicaplast', 'B5']),
    product: {
      name: 'Cicaplast Baume B5+ 100 ml',
      brand: 'La Roche-Posay',
      category: 'Nemlendirici',
      timeOfDay: 'both',
      imageUrl: '',
      cutoutImageUrl: 'local:la-roche-posay-cicaplast-baume-b5',
      description:
        'Hassas cildi yatıştırmaya, cilt bariyerini güçlendirmeye ve cildin onarım sürecini desteklemeye yardımcı yoğun bakım balmı.\n\nKullanım: Temiz ve kuru cilde günde iki kez uygulayın. Yüz, vücut ve dudaklarda kullanılabilir; göz çevresinden kaçının.\n\nİçindekiler (INCI): Aqua, Hydrogenated Polyisobutene, Dimethicone, Glycerin, Butyrospermum Parkii Butter / Shea Butter, Panthenol, Propanediol, Butylene Glycol, Aluminum Starch Octenylsuccinate, Cetyl PEG/PPG-10/1 Dimethicone, Trihydroxystearin, Zinc Gluconate, Madecassoside, Tribioma, Manganese Gluconate, Silica, Aluminum Hydroxide, Magnesium Sulfate, Disodium EDTA, Copper Gluconate, Capryloyl Glycine, Citric Acid, Acetylated Glycol Stearate, Polyglyceryl-4 Isostearate, Tocopherol, Pentaerythrityl Tetra-Di-T-Butyl Hydroxyhydrocinnamate, CI 77891 / Titanium Dioxide.',
      activeIngredients: ['%5 Panthenol', 'Madecassoside', 'Tribioma', 'Shea Yağı', 'Çinko', 'Bakır', 'Manganez'],
      isFavorite: false,
      isActive: true,
    },
  },
];

export const importPersonalShelfProducts = async (email?: string) => {
  if (normalize(email) !== normalize(TARGET_EMAIL)) return 0;

  const existingProducts = await productService.getProducts();
  let addedCount = 0;

  for (const item of shelfItems) {
    const existingProduct = existingProducts.find(item.matches);

    try {
      if (existingProduct) {
        if (item.keepCanonicalName && existingProduct.name !== item.product.name) {
          const updatedProduct = await productService.updateProduct(existingProduct.id, {
            ...existingProduct,
            name: item.product.name,
          });
          const index = existingProducts.findIndex(product => product.id === existingProduct.id);
          if (index >= 0) existingProducts[index] = updatedProduct;
        }
        continue;
      }

      const addedProduct = await productService.addProduct(item.product);
      existingProducts.push(addedProduct);
      addedCount += 1;
    } catch (error) {
      errorDev(`Ürün hesaba eklenemedi: ${item.product.brand} ${item.product.name}`, error);
    }
  }

  return addedCount;
};
