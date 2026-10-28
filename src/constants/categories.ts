// These are used for sorting the categories that we get from the api
// NOT for showing a list of filters
// TODO: remove this sorting once the backend api returns these sorted

export const CATEGORIES_IDS = [
    'fu001', // Furniture
    'st001', // Storage and organization
    'ka001', // Kitchen and Appliances
    'bm001', // Beds and mattresses
    'li001', // Lighting
    'tl001', // Home textiles
    'de001', // Home decor
    'kt001', // Kitchen and tableware
    'bc001', // Baby & kids
    'rm001', // Flooring
    'ba001', // Bathroom
    'od001', // Outdoor
    'pp001', // Plants and planters
    'hi001', // Home improvement
    'lc001', // Laundry & cleaning
    'pt001', // Pet accessories
    'he001', // Home electronics
    'hs001', // Smart home
    'fb001', // IKEA food & Swedish restaurant
    'wt001', // Winter holidays
] as const

export const SUBCATEGORIES_IDS = [
    'fu003', // Sofas & sectionals
    'fu004', // Tables & desks
    'st004', //  Dressers & storage drawers
    'fu002', // Chairs
    'bm003', // Beds
    '700417', // Dining furniture
    'st002', // Shelving furniture
    'fu006', // Armchairs & accent chairs
    '10475', // TV & media furniture
    'st003', // Display & storage cabinets
    'od003', // Outdoor furniture
    '30454', // Living room & entryway tables
    '19053', // Armoires & wardrobes
    '16244', // Bar furniture
    '55002', // Gaming furniture
    '18767', // Kids furniture
    '19141', // Café furniture
    '55036', // Furniture sets
    '45780', // Nursery Furniture
    'fu005', // Utility Carts, Rolling Carts & Storage Carts
    '46080', // Room dividers
    '46052', // Storage solution systems
    'st005', // Clothing storage & organization
    'st007', // Storage containers, organizers & baskets
    'st006', // Wall shelves & hooks
    '18706', // Kids storage & organization
    '700440', // Garage storage solutions
    '21958', // Outdoor storage: shelves, cabinets & boxes
    '16248', // Bags
    '46078', // Moving supplies
    '700292', // Kitchen cabinets
    'ka003', // Kitchen systems
    'ka002', // Appliances
    '10471', // Kitchen islands & carts
    '16200', // Pantry shelving
    '20676', // Kitchen organization & wall storage
    '24255', // Kitchen drawer organization
    '22957', // Modular kitchens
    '16282', // Kitchen lighting
    'tl004', // Bedding
    '20656', //  Nightstands
    '19059', // Underbed storage bags & bins
    '24825', // Mattress foundations & bases
    'li002', // Lamps & light fixtures
    '14971', // Decorative lighting
    '36812', // Smart lighting
    '16280', // Integrated lighting
    '10736', // Bathroom lighting
    '17897', // Outdoor lighting
    'tl002', // Window treatments
    '10659', // Decorative pillows & cushion covers
    '10653', // Rugs
    '18850', // Kitchen linens & textiles
    '18730', // Textiles for kids
    '20538', // Table linens
    '17893', // Outdoor cushions and pillows
    '10655', // Sewing products & material
    '10757', // Wall décor
    '20489', // Mirrors
    'pp003', // Plants & flowers
    '42926', // Home fragrance
    '10760', // Candle holders & candles
    '10769', // Vases & bowls
    'pp004', // Plant pots & stands
    '10550', // Storage boxes & organization bins
    '10574', // Bulletin boards, pin boards, peg boards & more
    '10759', // Clocks
    '24924', // Decorative accessories
    '18860', // Dinnerware
    '18868', // Drinkware
    '15937', // Food storage & organizing
    'kt003', // Cookware
    '16043', // Serveware
    'kt002', // Kitchen & cooking accessories
    '18865', // Flatware & cutlery
    '16044', // Coffee & tea accessories
    '20636', // Bakeware & accessories
    '15934', // Knives & cutting boards
    '15938', // Dishwashing accessories
    '18714', // Kids tableware & dinnerware
    '20560', // Napkins & napkin holders
    '42924', // Outdoor & picnic supplies
    'bc002', // Baby
    'bc003', // Kids
    '10698', // Door mats
    '700450', // Bathroom systems
    '20719', // Bathroom vanities
    'ba002', // Bathroom storage
    '10555', // Bathroom accessories
    '40690', // Showers
    '20490', // Bathroom mirrors
    'ba003', // Laundry
    '31787', // Outdoor plant accessories
    '34203', // Outdoor accessories
    '17887', // Outdoor umbrellas, canopies, gazebos & more
    '700349', // Outdoor kitchen & accessories
    '34204', // Outdoor rugs
    '20494', //  Plant stands
    '24887', // Plant supplies & accessories
    '20493', // Watering cans & plant misters
    '46077', // Acoustic panels
    '16292', //  Tools and accessories
    'sp001', // Home safety locks, latches & more
    '16213', // Trash & recycling
    '18741', // Waste sorting
    '48925', // Laundry cabinets & shelving
    '20601', // Laundry baskets & hampers
    '20602', // Drying racks
    '39569', // Cats
    '40842', // Wireless & home speakers
    '40843', // Cell phone, tablet & laptop accessories
    '40845', // Charging accessories & power cords
    '16195', // Cable management & cord organizers
    '49081', // Air purifiers & filters
    '46194', //  Wi-Fi speakers
    '56472', // Smart air purifiers
    '25211', // Beverages
    '49151', // Winter plants
] as const

export const SUB_CATEGORIES_IDS_MAP = {
    Beds: 'bm003',
    DecorativePillow: '10659',
    Duvets: 'tl004',
} as const

export const DORM_ESSENTIALS_ORDER = [
    '99582773', // LAGKAPTEN / SPÄND desk
    '40549403', // SPETSBOJ lamp
    '80588690', // RISATORP basket
    '89577753', // KLIPPAN loveseat
    '19445469', // LOBERGET / MALSKÄR desk chair
    '50575905', // NÖDMAST lamp
    '10598193', // STACKSTOD desk organizer
    '20601784', // PRUNKHALLON wall mirror
    '30601608', // NATTBAD speaker
    '40627537', // STORKLINTA dresser
    '30580922', // ELSYSTEM rug
    '80607330', // DUBBLA laptop desk
    '60555153', // DYVLINGE swivel chair
    '80499199', // VARMBLIXT wall lamp
    '00589090', // GRIMSARBO side table
    '60555087', // SOTENÄS yellow chair
    '10603335', // RIDSTIG rug
    '89406365', // SKÅDIS pegboard
    '10606782', // NISSAFORS cart (green)
    '70594615', // ENSMÄRKE lamp
    '40555309', // SKÅLBODA armchair (orange)
    '00492795', // LÄRANDE desk
    '00556508', // GARNANÄS coffee table
    '50364371', // KLUNKA laundry bag
    '20580847', // NISSAFORS cart (yellow)
    '30555159', // DOMSTEN stool
    '39501096', // ÖRFJÄLL swivel chair
    '60518716', // FIKONTRÄD frame
    '20476474', // BJÖRKÅSEN laptop stand
    '60485339', // PERJOHAN storage bench
    '60291708', // TJUSIG hanger
    '50474770', // ELLOVEN monitor stand
    '00428827', // DRÖNJÖNS desk organizer
    '10562071', // BÖNSYRSA desk organizer
    '99429578', // TROTTEN desk sit/stand
    '90292103', // MOSSLANDA wall ledge
    '10540847', // PLUTTIS wall clock
    '80423388', // SÖSDALA memo board
    '70601055', // TJENA storage box
    '30579023', // JORDMÅNEN wall hook
    '30510991', // GRANVÅG wall mirror
    '60347102', // FJANTIG wall hooks
    '90552308', // FLOTTILJ desk lamp
    '30219281', // DRÖNA storage box (black)
    '40217955', // DRÖNA storage box (white)
    '90480401', // KVISTBRO storage table
    '80242892', // JÄLL drying rack
    '60522049', // FYLLEN laundry basket
    '20461378', // KALAS bowl
    '00461379', // KALAS tumbler
    '80461380', // KALAS plate
    '60295438', // FNISS trash can
    '50511211', // SNÖRPA trash can
    '60532468', // FLÖNSA memo board
    '00297850', // UPPHETTA French press
    '40309573', // STUK under bed storage
    '30555296', // HÄSTVISKARE wall shelf/peg rack
    '00397307', // TRONES shoe storage
    '20458615', // LINDBYN mirror black (15")
    '70590797', // LINDBYN mirror red (11")
    '49554471', // ÖNNESTAD armchair
    '70498195', // MITTZON laptop table
    '30540479', // DEKAD alarm clock
    '90592125', // KUPONG alarm clock
    '30511014', // BONDTOLVAN alarm clock
    '30540851', // PLUTTIS wall clock (red)
    '30557078', // TROMMA wall clock
    '50395382', // PÄRKLA storage case
    '10496953', // TILLREDA refrigerator
    '10546482', // TILLREDA microwave
    '00447350', // ALSTERN bath mat
    '50231630', // RIGGA clothes rack
    '59561188', // KUGGIS storage box
    '60547974', // BLÅSVERK lamp
    '80574711', // NÄVLINGE desk lamp (yellow)
    '80404422', // NÄVLINGE desk lamp (black)
    '10498221', // UPPATVIND air purifier
    '50282177', // LACK wall shelf (small white)
    '70595417', // LACK wall shelf (small red)
    '60282186', // LACK wall shelf unit
    '60383519', // LACK white stained oak
    '60587045', // VÄGSKYLT door mat
    '30501053', // ULLERSLEV sheepskin rug
    '10593812', // STOCKHOLM 2025 rug
    '80582532', // VÄGSKYLT door mat (alternate)
    '60466246', // PILLEMARK door mat
    '90586563', // STOCKHOLM 2025 side table
    '80488737', // VIHALS nightstand
    '80104862', // STOCKHOLM rug (black/white)
    '20328228', // HALVED rug (multicolor stripe)
    '40503914', // HEMMAFIXARE
    '50554502', // PJÄTTERYD
    '60586611', // BRÄNNBOLL
    '99387007', // LYCKSELE LÖVÅS
    '90575300', // RIDSTIG
    '00601054', // TJENA magazine holder
    '10515334', // KUGGIS magazine holder
    '00583564', // BILD (wolf art)
    '10570537', // BILD (marbles art)
    '89424468', // FLINTAN
    '90507603', // HUVUDSPELARE
    '80462596', // ÄLVDALEN
    '40583557', // RÖDALM (purple art)
    '80507608', // MATCHSPEL
    '20570909', // PJÄTTERYD (alt)
    '29508951', // BJÖRKSTA
    '00550196', // APOTEKARE
]

export const WINTER_HOLIDAY_PRODUCTS = [
    '60604610', // VINTERFINT 2025 tray button
    '20603820', // VINTERFINT snowman jar w/lid
    '20606526', // VINTERFINT Christmas tree
    '30605022', // VINTERFINT tree skirt
    '30333286', // BROR work bench
    '20606574', // VINTERFINT artificial Poinsettia
    '50604936', // VINTERFINT wall decoration
    '40606554', // VINTERFINT wreath
    '40603857', // VINTERFINT candleholder
    '30611631', // VINTERFINT Santa Claus jar w/lid
    '89580755', // RÅSKOG / NORRÅVA trolley w/lid (blue)
    '70544866', // SKOGSTA chair (natural)
    '50555281', // TELEGRAFLINJE rug
    '70419264', // SKOGSTA table
    '50606167', // GRIMSBARO side table (red)
    '70604488', // VINTERFINT cup/saucer (green)
    '60613799', // VINTERFINT decoration Santa Claus
    '50525920', // PERSBOL chair (black)
    '80359844', // STRANDMON chair (green)
    '70590797', // LINDBYN mirror (red)
    '30394944', // SNIDAD woven basket
    '30574596', // KRÖNIKÖR storage (red)
    '90575300', // RIDSTIG rug (red)
    '80485338', // PERJOHAN (stool)
    '60601367', // AGAM junior chair (yellow)
    '60319972', // DUKTIG kids kitchen
    '50060713', // EKORRE rocking moose
    '90563571', // RODFLIK floor Lamp (green)
    '60611502', // VINTERFINT serving plate (blue)
    '79534735', // HAVSTA cabinet (white)
    '00611487', // VINTERFINT plate (green)
    '90604821', // VINTERFINT candle lantern
    '40609557', // VINTERFINT garland
    '80605543', // VINTERFINT vase (pink)
    '10500059', // HÖVOLM peg rack
    '60404201', // HAVSTA nesting tables (white)
    '69325469', // BERGSHULT / RAMSHULT wall shelf (white)
    '90584658', // TORNSBORG sofa
    '50560579', // LANDBANA rug (blue)
    '20607960', // STRÅLA table lamp (pink)
    '00606891', // STRÅLA LED Floor lamp
    '10606876', // VINTERFINT candelabra
    '10603335', // RIDSTIG rug (green)
    '50610904', // BLÅLJUS rug
    '40033763', // IVAR cabinet
    '30596536', // FLISAT stool
    '50282182', // LACK wall shelf
    '50298418', // FLISAT table
    '90530627', // TEODORES chair (blue)
    '60196358', // SUNDVIK chair (white)
    '10563773', // LISABO table
    '70292359', // KNAGGLIG storage bins
    '70528885', // VONSBÄK rug (blue)
    '70600428', // FÄRGKLAR plate
    '70607043', // BLADFÅGEL candle holder
    '50544867', // SKOGSTA chair (black)
    '50605709', // VARDAGEN casserole with lid (blue)
    '00138432', // BRANÄS storage bin
    '80275887', // KALLAX bookcase (white)
    '20545849', // VARARV placemats
    '70464275', // SOLKINT table lamp
    '40342134', // FULLTALIG black candlesticks
    '60155602', // DALFRED Stool
    '70591612', // SPETSBOJ lamp (green)
    '60590415', // TORSJÖ side table
    '70525919', // PERSBOL (red)
    '40578971', // TANEBRO side table (green)
    '40559190', // VIPPSTARR napkins
    '00586548', // AKTERSPRING table lamp
    '70578451', // GLADOM tray table (green)
    '10424517', // SOLSKUR lamp
    '60609231', // DAKSJUS plant pot green
    '50360009', // STRANDMON ottoman (green)
    '60323894', // TÄRNABY lamp (black)
    '09484809', // KIVIK sofa green
    '10462180', // ÄSPERÖD side table
    '60566364', // RÖDALM frame (red)
    '40529476', // PINNTORP chair (red)
    '40562079', // KALLAX bookcase (green)
    '90578902', // PJÄTTERYD artwork (flowers)
    '50343939', // BEGÅVNING glass dome
    '30321373', // ÅRSTID table lamp
    '30502142', // STÖRTSKÖN candle (red)
    '50590406', // TORSJÖ coffee table
    '80485569', // LINDBYN round mirror (gold)
    '50348545', // PÄRLBAND tealight holder
    '50343005', // GLATTIS coasters
    '90590490', // STOCKHOLM 2025 vase (brown)
    '10570245', // JÄRRESTAD ottoman
    '60597959', // LINDBYN arched gold mirror
    '20399777', // NISSAFORS cart
    '10511963', // KONSTFULL vase (green brown)
    '90512666', // TOLKNING storage ottoman
    '30583384', // GRUNNARP sleeper sofa
    '90594756', // STOCKHOLM 2025 ottoman
    '60551225', // FRIHETEN sleeper sofa
    '40570244', // FÖRLUNDA ottoman
    '70604879', // FÄRGKLAR mug
    '10600426', // FÄRGKLAR bowl
    '00600714', // GLADELIG lrg bowl
    '70600720', // GLADELIG plate
    '50348258', // MÖRBYLÅNGA bench
    '10593807', // SKOGSTA bench
    '80415468', // LOMMARP cabinet (green)
    '40415465', // LOMMARP bookcase (green)
    '70331394', // RANARP wall lamp
    '90331374', // RANARP floor lamp (black)
    '90570430', // GJÄTTA storage box (red)
    '10600723', // GLADELIG bowl
    '50331385', // RANARP table lamp
]
