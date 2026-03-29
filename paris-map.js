(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
        return;
    }
    root.SVPParisMap = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const FEATURED_REFERENCE_ORDER = Object.freeze([
        'PA00088801',
        'PA00088804',
        'PA00086250',
        'PA00088420',
        'PA75180004',
        'PA00085992',
        'PA00088714',
        'PA00089004',
        'PA00088689',
        'PA00086001'
    ]);

    const FEATURED_EDITORIAL = Object.freeze({
        PA00088801: Object.freeze({
            eyebrow: 'Biểu tượng hoàng hôn',
            teaser: 'Điểm ngắm Paris rực sáng nhất khi bầu trời chuyển vàng cam.',
            accent: '#ff7a59',
            icon: 'fa-tower-observation'
        }),
        PA00088804: Object.freeze({
            eyebrow: 'Trục đại lộ kinh điển',
            teaser: 'Một vòng sao đô thị nơi Paris phô diễn sự hùng vĩ rõ nhất.',
            accent: '#ffb703',
            icon: 'fa-monument'
        }),
        PA00086250: Object.freeze({
            eyebrow: 'Gothic giữa sông Seine',
            teaser: 'Trái tim lịch sử của Paris, đẹp nhất khi đi bộ dọc Ile de la Cite.',
            accent: '#f97316',
            icon: 'fa-church'
        }),
        PA00088420: Object.freeze({
            eyebrow: 'Mái vòm tri thức',
            teaser: 'Một điểm dừng vừa uy nghi vừa có tầm nhìn cổ điển của Khu Latin.',
            accent: '#14b8a6',
            icon: 'fa-landmark-dome'
        }),
        PA75180004: Object.freeze({
            eyebrow: 'Montmartre trên cao',
            teaser: 'Toàn cảnh Paris bừng lên từ triền đồi trắng và những bậc thang dài.',
            accent: '#ef476f',
            icon: 'fa-camera-retro'
        }),
        PA00085992: Object.freeze({
            eyebrow: 'Paris của nghệ thuật',
            teaser: 'Louvre và Tuileries tạo nên một dải tham quan vừa sang vừa thoáng.',
            accent: '#2563eb',
            icon: 'fa-gem'
        }),
        PA00088714: Object.freeze({
            eyebrow: 'Mái vòm vàng',
            teaser: 'Một trong những silhouette đẹp nhất Paris, nổi bật nhất lúc nắng nhẹ.',
            accent: '#d97706',
            icon: 'fa-medal'
        }),
        PA00089004: Object.freeze({
            eyebrow: 'Kịch tính Belle Epoque',
            teaser: 'Mặt tiền lộng lẫy và khu phố sáng đèn khiến khu Opera luôn có năng lượng.',
            accent: '#d946ef',
            icon: 'fa-masks-theater'
        }),
        PA00088689: Object.freeze({
            eyebrow: 'Bảo tàng bên sông',
            teaser: 'Một khối kiến trúc vừa mềm vừa sang, đi cùng bờ Seine rất hút mắt.',
            accent: '#0ea5e9',
            icon: 'fa-train-subway'
        }),
        PA00086001: Object.freeze({
            eyebrow: 'Kính màu huyền ảo',
            teaser: 'Không gian Gothic nén lại trong một điểm dừng cực giàu chi tiết.',
            accent: '#8b5cf6',
            icon: 'fa-place-of-worship'
        })
    });

    const FEATURED_BOOTSTRAP_ITEMS = Object.freeze([
        Object.freeze({
            reference: 'PA00088801',
            name_vn: 'Tháp Eiffel',
            address_vn: 'Champ-de-Mars, Quận 7 Paris',
            commune_forme_index: 'Paris 7e Arrondissement',
            lat: 48.8582640632748,
            lon: 2.29450471981574,
            score: 0.925,
            category_vn: 'tượng đài',
            domaine_vn: 'kiến trúc văn hóa, nghiên cứu, thể thao hoặc giải trí',
            story_vn: 'Tháp Eiffel là biểu tượng rực sáng nhất của Paris, nổi bật với khung thép thanh mảnh và tầm nhìn 360 độ trên toàn thành phố.'
        }),
        Object.freeze({
            reference: 'PA00088804',
            name_vn: "Khải Hoàn Môn de l'Etoile",
            address_vn: 'quảng trường Charles-de-Gaulle, Quận 8, Paris',
            commune_forme_index: 'Paris 8e Arrondissement',
            lat: 48.873780394850904,
            lon: 2.29504124772799,
            score: 0.9025,
            category_vn: 'khải hoàn môn',
            domaine_vn: 'kiến trúc tang lễ, tưởng niệm hoặc dâng hiến',
            story_vn: 'Khải Hoàn Môn neo trục Champs-Elysees bằng một hình khối đầy uy lực, rất hợp cho những khung hình đại lộ Paris.'
        }),
        Object.freeze({
            reference: 'PA00086250',
            name_vn: 'Nhà thờ Đức Bà',
            address_vn: 'Quận 4 Paris',
            commune_forme_index: 'Paris 4e Arrondissement',
            lat: 48.85293687448671,
            lon: 2.3500514067889,
            score: 0.875,
            category_vn: 'nhà thờ lớn',
            domaine_vn: 'kiến trúc tôn giáo',
            story_vn: 'Nhà thờ Đức Bà là điểm neo lịch sử của Ile de la Cite, nổi bật với lớp Gothic nhiều chiều sâu và câu chuyện của cả thành phố.'
        }),
        Object.freeze({
            reference: 'PA00088420',
            name_vn: 'Nhà thờ Sainte-Geneviève cũ, trở thành Le Panthéon',
            address_vn: 'quảng trường Panthéon, Quận 5 Paris',
            commune_forme_index: 'Paris 5e Arrondissement',
            lat: 48.8462196694408,
            lon: 2.3460392355371,
            score: 0.875,
            category_vn: 'nhà thờ',
            domaine_vn: 'kiến trúc tôn giáo',
            story_vn: 'Panthéon mang cảm giác Paris cổ điển, cân xứng và tĩnh tại, nằm giữa khu Latin đầy tri thức.'
        }),
        Object.freeze({
            reference: 'PA75180004',
            name_vn: 'Vương cung thánh đường Sacré-Coeur, các công trình phụ và quảng trường Louise-Michel',
            address_vn: '35 rue du Chevalier de la Barre, Quận 18, Paris',
            commune_forme_index: 'Paris 18e Arrondissement',
            lat: 48.88541912477373,
            lon: 2.3435657636270992,
            score: 0.875,
            category_vn: 'vương cung thánh đường;quảng trường',
            domaine_vn: 'kiến trúc tôn giáo; kiến trúc vườn',
            story_vn: 'Sacré-Coeur đứng trên đỉnh Montmartre như một sân thượng trắng nhìn trọn thành phố, rất sáng và rất Paris.'
        }),
        Object.freeze({
            reference: 'PA00085992',
            name_vn: 'Cung điện Louvre và vườn Tuileries',
            address_vn: 'quai du Louvre ; avenue du Général-Lemonier ; rue de Rivoli, Quận 1 Paris',
            commune_forme_index: 'Paris 1er Arrondissement',
            lat: 48.8627008026149,
            lon: 2.32992797460275,
            score: 0.875,
            category_vn: 'cung điện; lâu đài',
            domaine_vn: 'kiến trúc nhà ở',
            story_vn: 'Louvre và Tuileries kết nối nghệ thuật, sân trong và mảng xanh thành một trục tham quan cực giàu nhịp điệu thị giác.'
        }),
        Object.freeze({
            reference: 'PA00088714',
            name_vn: 'Khách sạn des Invalides',
            address_vn: 'Quận 7 Paris',
            commune_forme_index: 'Paris 7e Arrondissement',
            lat: 48.8562400513428,
            lon: 2.31236490065949,
            score: 0.8725,
            category_vn: 'bệnh viện;khách sạn;công trình quân sự',
            domaine_vn: 'kiến trúc tôn giáo; kiến trúc bệnh viện, hỗ trợ hoặc bảo trợ xã hội; kiến trúc quân sự',
            story_vn: 'Invalides gây ấn tượng bởi mái vòm vàng, các khối sân rộng và cảm giác trật tự rất đặc trưng của Paris cổ điển.'
        }),
        Object.freeze({
            reference: 'PA00089004',
            name_vn: 'Nhà hát quốc gia Opéra, gọi là Opéra Garnier',
            address_vn: 'Quận 9 Paris',
            commune_forme_index: 'Paris 9e Arrondissement',
            lat: 48.8720310148122,
            lon: 2.33179066386024,
            score: 0.8575,
            category_vn: 'nhà hát opera',
            domaine_vn: 'kiến trúc văn hóa, nghiên cứu, thể thao hoặc giải trí',
            story_vn: 'Opéra Garnier là lớp Paris sân khấu, lộng lẫy và sáng đèn, rất hợp để mở một hành trình khám phá thành phố.'
        }),
        Object.freeze({
            reference: 'PA00088689',
            name_vn: 'Ga Orsay cũ, hiện nay là bảo tàng Orsay',
            address_vn: '7, 9 quai Anatole-France; rue de Lille, Quận 7 Paris',
            commune_forme_index: 'Paris 7e Arrondissement',
            lat: 48.859918789814,
            lon: 2.32657970144273,
            score: 0.8575,
            category_vn: 'nhà ga; bảo tàng',
            domaine_vn: null,
            story_vn: 'Orsay biến kiến trúc nhà ga thành một bảo tàng mềm mại nhìn ra sông Seine, vừa nghệ thuật vừa gần gũi.'
        }),
        Object.freeze({
            reference: 'PA00086001',
            name_vn: 'Sainte-Chapelle',
            address_vn: 'đại lộ du Palais, Quận 1 Paris',
            commune_forme_index: 'Paris 1er Arrondissement',
            lat: 48.8553930118762,
            lon: 2.34499381915239,
            score: 0.8525,
            category_vn: 'nhà nguyện',
            domaine_vn: 'kiến trúc tôn giáo',
            story_vn: 'Sainte-Chapelle là một viên ngọc Gothic cô đọng, nổi bật bởi chiều cao nội thất và lớp kính màu đầy kịch tính.'
        })
    ]);

    const PARIS_PLACE_DETAILS = Object.freeze({
        PA00088801: {
            slug: 'thap-eiffel',
            shortName: 'Tháp Eiffel',
            heroEyebrow: 'Biểu tượng Paris',
            metaDescription: 'Tháp Eiffel là điểm ngắm Paris đẹp nhất lúc thành phố bắt đầu lên đèn, từ Champ-de-Mars đến những tầng quan sát nhìn trọn bờ Seine.',
            intro: 'Không có nơi nào khiến bạn hiểu chữ "Paris" nhanh bằng đứng dưới chân Tháp Eiffel rồi nhìn bầu trời chuyển từ xanh nhạt sang vàng mật. Buổi chiều ở đây kéo dài như một màn dạo đầu: Champ-de-Mars đầy người picnic, cầu Bir-Hakeim bắt sáng và đến lúc tháp lên đèn, cả khu vực đổi sang một nhịp rất điện ảnh.',
            overview: 'Được dựng cho Exposition Universelle năm 1889, Tháp Eiffel nay là biểu tượng dễ nhận ra nhất của nước Pháp. Ba tầng tham quan cho ba sắc thái khác nhau: tầng một thoáng đãng, tầng hai cho góc nhìn cân bằng nhất và đỉnh tháp mang lại cảm giác Paris mở ra như một tấm bản đồ sống.',
            whyGo: 'Nếu bạn chỉ có một buổi tối ở Paris, đây là nơi đáng giữ lại. Từ Trocadéro nhìn sang, từ thang máy đi lên hay từ bờ Seine quay lại ngắm hệ khung thép phát sáng, Eiffel luôn cho cảm giác thành phố đang trình diễn phiên bản đẹp nhất của mình.',
            bestMoment: 'Cuối chiều đến đầu tối là đẹp nhất, đặc biệt trong ngày trời quang hoặc ngay sau một cơn mưa nhẹ.',
            routePlan: 'Đi bộ qua Champ-de-Mars, vòng sang Trocadéro để lấy góc nhìn đối diện rồi nối thêm một chuyến du thuyền Seine nếu muốn tối Paris trọn vẹn hơn.',
            nearby: 'Trocadéro, cầu Bir-Hakeim và các bến du thuyền trên sông Seine.',
            moods: ['Hoàng hôn', 'Toàn cảnh 360°', 'Biểu tượng Paris'],
            highlights: [
                { icon: 'fa-eye', title: 'Tầng 2 là điểm ngắm cân bằng nhất', text: 'Ở cao độ này bạn vẫn thấy rõ nhịp phố, mái nhà kẽm xám và các đại lộ mở ra từ trung tâm.' },
                { icon: 'fa-lightbulb', title: 'Khoảnh khắc lên đèn rất đáng chờ', text: 'Paris chuyển từ một thành phố du lịch sang một thành phố điện ảnh rõ nhất quanh khu Eiffel.' },
                { icon: 'fa-ship', title: 'Rất hợp để nối với bờ Seine', text: 'Chỉ vài phút đi bộ là đã có du thuyền, cầu đẹp và rất nhiều góc chụp mở về phía sông.' }
            ],
            sourceLinks: [
                { label: 'Trang chính thức Tour Eiffel', url: 'https://www.toureiffel.paris/en' }
            ]
        },
        PA00088804: {
            slug: 'khai-hoan-mon-etoile',
            shortName: "Khải Hoàn Môn de l'Etoile",
            heroEyebrow: 'Paris hùng vĩ',
            metaDescription: "Khải Hoàn Môn de l'Etoile cho một trong những góc nhìn 360 độ đẹp nhất Paris, nơi các đại lộ tỏa ra như hình ngôi sao.",
            intro: 'Khải Hoàn Môn là nơi khiến Paris bỗng trở nên trật tự, hùng vĩ và rất điện ảnh. Đứng trên sân thượng, bạn nhìn thấy các đại lộ tỏa ra như hình ngôi sao, từ Champs-Elysées đến La Défense, và hiểu ngay vì sao đây là một trong những điểm ngắm đô thị đẹp nhất châu Âu.',
            overview: 'Công trình được khởi công năm 1806 theo ý nguyện của Napoleon sau Austerlitz và hoàn thành năm 1836. Dưới vòm là Mộ Chiến sĩ Vô danh và ngọn lửa tưởng niệm, khiến nơi này vừa là một biểu tượng chiến thắng vừa là điểm neo của ký ức quốc gia.',
            whyGo: 'Điểm hấp dẫn nhất ở đây là cảm giác quy mô. Từ mặt đất, bạn thấy những nhóm phù điêu và khối đá nặng nề; từ trên cao, Paris trở thành một màn sắp đặt hoàn hảo của đại lộ, cây xanh và ánh đèn xe.',
            bestMoment: 'Chiều muộn hoặc đầu tối, khi trục Champs-Elysées sáng dần mà bầu trời vẫn còn màu lam.',
            routePlan: 'Đi bộ dọc Champs-Elysées rồi lên sân thượng, sau đó nối tiếp về Place de la Concorde hoặc băng sang Trocadéro.',
            nearby: 'Champs-Elysées, avenue de Friedland, Trocadéro và Parc Monceau.',
            moods: ['View 360°', 'Trục đại lộ', 'Paris uy nghi'],
            highlights: [
                { icon: 'fa-road', title: 'Một trong những trục nhìn đẹp nhất Paris', text: 'Từ sân thượng, thành phố mở ra theo đúng logic quy hoạch cổ điển của các đại lộ tỏa sao.' },
                { icon: 'fa-fire', title: 'Ký ức lịch sử hiện diện ngay dưới vòm', text: 'Mộ Chiến sĩ Vô danh và ngọn lửa tưởng niệm tạo chiều sâu cảm xúc hiếm có cho chuyến ghé thăm.' },
                { icon: 'fa-camera', title: 'Rất hợp cho ảnh thành phố về đêm', text: 'Ánh xe trên Champs-Elysées và đường chân trời phía La Défense lên ảnh cực kỳ ấn tượng.' }
            ],
            sourceLinks: [
                { label: 'Trang chính thức Arc de Triomphe', url: 'https://www.paris-arc-de-triomphe.fr/en/' }
            ]
        },
        PA00086250: {
            slug: 'nha-tho-duc-ba-paris',
            shortName: 'Nhà thờ Đức Bà Paris',
            heroEyebrow: 'Trái tim lịch sử',
            metaDescription: 'Notre-Dame de Paris là trái tim Gothic của Ile de la Cite, nơi bờ Seine, quảng trường và lịch sử thành phố gặp nhau.',
            intro: 'Dù bạn đến Paris lần đầu hay lần thứ năm, đứng trước Notre-Dame vẫn có cảm giác mình chạm vào nhịp tim của thành phố. Île de la Cité khiến mọi bước chân chậm lại: chuông nhà thờ, bờ Seine, những cây cầu đá và mặt tiền Gothic khiến cả khu vực giống như Paris nguyên bản.',
            overview: 'Nhà thờ được khởi công từ thế kỷ 12 và là một kiệt tác Gothic của châu Âu. Sau vụ cháy ngày 15 tháng 4 năm 2019, công trình mở cửa trở lại vào tháng 12 năm 2024, khiến chuyến ghé thăm hôm nay mang theo cả cảm giác xúc động lẫn hy vọng.',
            whyGo: 'Nơi này không chỉ đẹp ở mặt tiền. Nó đẹp ở toàn bộ bối cảnh: quảng trường phía trước, bờ sông, các cây cầu và những góc nhìn từ Pont Saint-Louis hay Pont de l’Archevêché. Nếu thích Paris kiểu thơ, đây là điểm gần như không thể thay thế.',
            bestMoment: 'Buổi sáng sớm để cảm nhận sự tĩnh hơn, hoặc cuối ngày nếu muốn nối thẳng sang một vòng đi bộ ven Seine.',
            routePlan: 'Bắt đầu từ parvis trước nhà thờ, vòng quanh đảo, ghé Sainte-Chapelle rồi kết thúc bằng một quán cà phê ở Khu Latin.',
            nearby: 'Sainte-Chapelle, Conciergerie, Pont Saint-Louis và khu sách quanh Saint-Michel.',
            moods: ['Gothic', 'Bờ Seine', 'Paris lịch sử'],
            highlights: [
                { icon: 'fa-church', title: 'Một mặt tiền Gothic kinh điển', text: 'Những tháp chuông, cửa vòm và phù điêu tạo nên một trong các hình ảnh biểu tượng nhất châu Âu.' },
                { icon: 'fa-water', title: 'Cảnh đẹp nằm cả bên ngoài nhà thờ', text: 'Đi bộ quanh đảo giúp bạn cảm được trọn nhịp Paris với sông, cầu và các khối đá cổ.' },
                { icon: 'fa-heart', title: 'Một chuyến ghé thăm rất giàu cảm xúc', text: 'Câu chuyện phục dựng sau vụ cháy khiến trải nghiệm ở đây sâu hơn một điểm check-in thông thường.' }
            ],
            sourceLinks: [
                { label: 'Trang chính thức Notre-Dame de Paris', url: 'https://www.notredamedeparis.fr/en/' }
            ]
        },
        PA00088420: {
            slug: 'pantheon-paris',
            shortName: 'Panthéon Paris',
            heroEyebrow: 'Mái vòm tri thức',
            metaDescription: 'Panthéon mang đến một Paris trang nghiêm và trí tuệ, từ hầm mộ các danh nhân đến mái vòm nhìn xuống Khu Latin.',
            intro: 'Panthéon không phô trương như Eiffel hay sáng đèn như Opéra Garnier, nhưng lại cho một dạng Paris rất có chiều sâu: nghiêm trang, trí tuệ và đầy ký ức. Từ quảng trường phía trước nhìn xuống Khu Latin, bạn có cảm giác thành phố này được xây dựng không chỉ bằng đá mà còn bằng tư tưởng.',
            overview: 'Ban đầu là nhà thờ Sainte-Geneviève, công trình dần trở thành nơi an nghỉ của những nhân vật làm nên lịch sử Pháp. Hầm mộ có Victor Hugo, Voltaire, Rousseau, Marie Curie; không gian trung tâm từng treo con lắc Foucault minh họa chuyển động của Trái Đất.',
            whyGo: 'Panthéon hấp dẫn vì cho bạn hai trải nghiệm trong một: phần dưới là chiều sâu lịch sử, phần trên là mái vòm với một trong những góc nhìn đẹp và bớt ồn hơn về Paris.',
            bestMoment: 'Đi buổi sáng hoặc đầu giờ chiều rồi tiếp tục lang thang trong Khu Latin.',
            routePlan: 'Kết hợp cùng Luxembourg Gardens, Sorbonne, rue Mouffetard hoặc bờ Seine phía Saint-Michel.',
            nearby: 'Vườn Luxembourg, Sorbonne, rue Mouffetard và Khu Latin.',
            moods: ['Khu Latin', 'Lịch sử tư tưởng', 'Mái vòm'],
            highlights: [
                { icon: 'fa-book-open', title: 'Không khí của Paris trí thức', text: 'Panthéon đứng giữa một khu vực giàu trường học, thư viện và quán cà phê cổ điển.' },
                { icon: 'fa-skull', title: 'Hầm mộ kể câu chuyện nước Pháp', text: 'Những tên tuổi lớn trong văn học, triết học và khoa học tạo cho nơi này trọng lượng rất riêng.' },
                { icon: 'fa-dharmachakra', title: 'Con lắc Foucault làm công trình sống động hơn', text: 'Nó biến một tượng đài tưởng niệm thành nơi khoa học và lịch sử giao nhau.' }
            ],
            sourceLinks: [
                { label: 'Trang chính thức Panthéon', url: 'https://www.paris-pantheon.fr/en/' }
            ]
        },
        PA75180004: {
            slug: 'sacre-coeur-montmartre',
            shortName: 'Sacré-Coeur Montmartre',
            heroEyebrow: 'Montmartre trên cao',
            metaDescription: 'Sacré-Coeur trên đồi Montmartre cho toàn cảnh Paris rất thoáng, cộng thêm chất nghệ sĩ của các con dốc và ngõ nhỏ xung quanh.',
            intro: 'Sacré-Coeur là nơi Paris bỗng trở nên vừa rộng vừa thân mật. Bạn leo lên đồi Montmartre qua những bậc thang dài, ngoảnh lại và thấy cả thành phố mở dần dưới chân. Màu trắng của vương cung thánh đường nổi bật ngay cả trong ngày xám, còn khu phố xung quanh giữ được chất nghệ sĩ mà du khách thường tìm ở Paris.',
            overview: 'Nằm trên đỉnh đồi Montmartre, basilica nổi bật với đá travertine sáng màu và truyền thống cầu nguyện liên tục suốt ngày đêm từ cuối thế kỷ 19. Đây vừa là nơi hành hương, vừa là một ban công tự nhiên nhìn xuống Paris.',
            whyGo: 'Điểm hấp dẫn lớn nhất không chỉ là nhà thờ mà là toàn bộ nhịp Montmartre: quảng trường, họa sĩ đường phố, quán cà phê nhỏ, ngõ dốc và tiếng đàn vọng xuống từ các bậc thang.',
            bestMoment: 'Sáng sớm nếu muốn yên, hoặc cuối chiều nếu muốn ngắm Paris sáng dần từ trên cao.',
            routePlan: 'Lên bằng funicular hoặc bậc thang Louise-Michel, ghé Place du Tertre rồi đi tiếp qua những con dốc nhỏ của Montmartre.',
            nearby: 'Place du Tertre, các con ngõ Montmartre, rue de l’Abreuvoir và khu dưới chân đồi.',
            moods: ['Montmartre', 'Toàn cảnh', 'Lang thang'],
            highlights: [
                { icon: 'fa-mountain-city', title: 'Một ban công tự nhiên nhìn ra Paris', text: 'Ít nơi nào cho cảm giác thành phố mở rộng nhanh và đẹp như khi đứng trên sườn Montmartre.' },
                { icon: 'fa-place-of-worship', title: 'Kiến trúc trắng rất dễ nhận diện', text: 'Sacré-Coeur nổi bật cả trong ngày nắng lẫn ngày âm u nhờ chất đá sáng và hình khối vòm.' },
                { icon: 'fa-palette', title: 'Khu phố xung quanh mới là nửa còn lại', text: 'Montmartre giữ được chất nghệ sĩ, rất hợp để đi chậm, rẽ ngẫu hứng và tìm các góc ảnh riêng.' }
            ],
            sourceLinks: [
                { label: 'Trang chính thức Sacré-Coeur', url: 'https://www.sacre-coeur-montmartre.com/en/' }
            ]
        },
        PA00085992: {
            slug: 'louvre-va-vuon-tuileries',
            shortName: 'Louvre và vườn Tuileries',
            heroEyebrow: 'Paris của nghệ thuật',
            metaDescription: 'Louvre và vườn Tuileries kết hợp cung điện, kim tự tháp kính và những lối dạo thanh lịch thành một buổi Paris rất trọn.',
            intro: 'Louvre không chỉ là một bảo tàng mà là một trạng thái của Paris. Bạn đi từ Cour Napoléon dưới kim tự tháp kính, băng qua những sân trong đồ sộ rồi trôi ra vườn Tuileries nơi thành phố bỗng nhẹ lại với ghế xanh, hồ nước và các trục cây thẳng tắp.',
            overview: 'Từ pháo đài trung cổ đến cung điện hoàng gia rồi bảo tàng lớn bậc nhất thế giới, Louvre là một lớp địa tầng lịch sử của Paris. Kim tự tháp của I.M. Pei đưa một nét đương đại rất sắc vào trung tâm quần thể cổ điển; còn Tuileries là phần thở của toàn bộ khu vực.',
            whyGo: 'Ngay cả khi không vào hết các gallery, chỉ riêng việc đi giữa Cour Carrée, Cour Napoléon và Tuileries đã đủ tạo nên một buổi Paris rất sang mà vẫn dễ gần.',
            bestMoment: 'Buổi sáng sớm trong museum hoặc cuối chiều ở Tuileries để ánh nắng quét ngang tượng đá và hàng cây.',
            routePlan: 'Chọn vài tác phẩm nhất định trong Louvre, sau đó ra vườn Tuileries rồi đi tiếp đến Place de la Concorde hoặc men theo Seine về Orsay.',
            nearby: 'Palais Royal, Musée de l’Orangerie, Place de la Concorde và bờ Seine.',
            moods: ['Nghệ thuật', 'Cung điện', 'Tản bộ thanh lịch'],
            highlights: [
                { icon: 'fa-gem', title: 'Một quần thể vừa cổ điển vừa đương đại', text: 'Kim tự tháp kính làm cho toàn bộ Louvre có thêm nhịp điệu thị giác rất hiện đại.' },
                { icon: 'fa-landmark', title: 'Sân trong và hành lang mang cảm giác điện ảnh', text: 'Ngay cả khi chưa bước vào gallery, khuôn viên Louvre đã đủ khiến chuyến đi đáng giá.' },
                { icon: 'fa-tree', title: 'Tuileries giúp buổi tham quan dễ thở hơn', text: 'Sau phần nghệ thuật đậm đặc, bạn có ngay một không gian xanh để ngồi lại và ngắm người Paris.' }
            ],
            sourceLinks: [
                { label: 'Trang chính thức Louvre', url: 'https://www.louvre.fr/en' }
            ]
        },
        PA00088714: {
            slug: 'invalides',
            shortName: 'Invalides',
            heroEyebrow: 'Mái vòm vàng',
            metaDescription: 'Invalides kết hợp mái vòm dát vàng, lịch sử quân sự Pháp và các khoảng sân rất rộng thành một trong những silhouette đẹp nhất Paris.',
            intro: 'Nếu Eiffel là Paris rực sáng, Invalides là Paris trang trọng. Mái vòm vàng của Dôme des Invalides bắt nắng rất mạnh, nhìn từ xa đã đủ kéo bạn đến gần. Đến nơi, quảng trường rộng và nhịp bước chậm khiến nơi này rất hợp cho những ai thích Paris uy nghi nhưng không ồn.',
            overview: 'Quần thể do Louis XIV cho xây từ năm 1670 để chăm sóc thương binh và cựu binh, nay là nơi đặt Musée de l’Armée và lăng Napoleon. Sự kết hợp giữa lịch sử quân sự, sân danh dự và mái vòm dát vàng tạo ra một đường nét rất riêng trên chân trời Paris.',
            whyGo: 'Invalides hấp dẫn vì cho bạn cả hình ảnh lẫn chiều sâu: bên ngoài là một trong những mái vòm đẹp nhất thành phố, bên trong là câu chuyện nước Pháp được kể qua chiến tranh, nghi lễ và ký ức.',
            bestMoment: 'Ngày nắng nhẹ hoặc cuối chiều, khi mái vòm vàng phản sáng rõ và các khối sân đổ bóng đẹp.',
            routePlan: 'Ghép cùng cầu Alexandre III, Musée Rodin hoặc một đoạn dạo ven Seine phía quận 7.',
            nearby: 'Pont Alexandre III, Musée Rodin, Champ-de-Mars và các đại lộ rộng của quận 7.',
            moods: ['Mái vòm vàng', 'Lịch sử Pháp', 'Paris cổ điển'],
            highlights: [
                { icon: 'fa-crown', title: 'Mái vòm vàng cực kỳ ăn nắng', text: 'Đây là một trong những điểm nhận diện đẹp nhất của đường chân trời Paris cổ điển.' },
                { icon: 'fa-medal', title: 'Lịch sử được kể bằng không gian thật', text: 'Các sân, dãy nhà và phần mộ của Napoleon cho cảm giác quá khứ vẫn còn ở rất gần.' },
                { icon: 'fa-columns', title: 'Rộng và trang trọng nhưng không nặng nề', text: 'Invalides giữ được vẻ uy nghi mà vẫn rất dễ kết hợp trong một buổi đi bộ dọc sông.' }
            ],
            sourceLinks: [
                { label: 'Trang chính thức Musée de l’Armée - Invalides', url: 'https://www.musee-armee.fr/en/' }
            ]
        },
        PA00089004: {
            slug: 'opera-garnier',
            shortName: 'Opéra Garnier',
            heroEyebrow: 'Kịch tính Belle Epoque',
            metaDescription: 'Opéra Garnier là điểm chạm của Paris Belle Epoque với Grand Staircase, Grand Foyer và ánh đèn của khu Opéra.',
            intro: 'Có những nơi ở Paris khiến bạn muốn ăn mặc chỉnh tề hơn bình thường, và Opéra Garnier là một trong số đó. Mặt tiền dày tượng, đồng, đá và vàng lá đã rất kịch tính; bước vào bên trong, Grand Staircase và Grand Foyer đẩy cảm giác lộng lẫy lên thêm một nấc.',
            overview: 'Khánh thành năm 1875, Palais Garnier do Charles Garnier thiết kế là đỉnh cao của phong cách Beaux-Arts. Auditorium kiểu Ý, trần vẽ của Marc Chagall và các sảnh dành cho khán giả biến cả tòa nhà thành một sân khấu xã hội đúng nghĩa.',
            whyGo: 'Không cần xem một vở diễn, chỉ riêng việc đi qua các không gian công cộng của nhà hát đã đủ để hiểu Paris Belle Epoque từng mê ánh sáng, nhung đỏ và vàng óng như thế nào.',
            bestMoment: 'Buổi chiều rồi ở lại khu Opéra đến tối, khi đại lộ và các mặt tiền thương mại bắt đầu lên đèn.',
            routePlan: 'Kết hợp Galeries Lafayette rooftop, Place Vendôme, Madeleine hoặc một vòng qua Palais Royal.',
            nearby: 'Galeries Lafayette, boulevard Haussmann, Place Vendôme và Madeleine.',
            moods: ['Belle Epoque', 'Nội thất lộng lẫy', 'Paris đêm'],
            highlights: [
                { icon: 'fa-stairs', title: 'Grand Staircase đúng nghĩa sân khấu', text: 'Cầu thang lớn của Garnier khiến khoảnh khắc bước vào đã có cảm giác như đang tham gia một buổi trình diễn.' },
                { icon: 'fa-masks-theater', title: 'Auditorium là trái tim của tòa nhà', text: 'Nhung đỏ, loge, đèn chùm và trần Chagall tạo nên một thứ xa hoa rất Paris.' },
                { icon: 'fa-wand-magic-sparkles', title: 'Khu Opéra càng đẹp khi trời tối', text: 'Ánh đèn phố và nhịp thương mại quanh đó khiến trải nghiệm có thêm năng lượng đô thị.' }
            ],
            sourceLinks: [
                { label: 'Trang tham quan Palais Garnier', url: 'https://www.operadeparis.fr/en/visits/palais-garnier' },
                { label: 'Giới thiệu Palais Garnier - Opéra national de Paris', url: 'https://www.operadeparis.fr/en/about/theaters-and-workshops/palais-garnier' }
            ]
        },
        PA00088689: {
            slug: 'bao-tang-orsay',
            shortName: 'Bảo tàng Orsay',
            heroEyebrow: 'Bảo tàng bên sông',
            metaDescription: 'Bảo tàng Orsay biến một nhà ga của Exposition Universelle 1900 thành nơi ngắm nghệ thuật và kiến trúc duyên dáng nhất bên bờ Seine.',
            intro: 'Musée d’Orsay là kiểu nơi khiến người mê Paris cảm thấy thành phố này biết cách biến cái cũ thành cái rất quyến rũ. Từ một ga tàu của Exposition Universelle 1900 thành bảo tàng nghệ thuật, Orsay giữ lại đồng hồ lớn, không gian trần cao và nhịp nhìn ra bờ Seine rất đặc trưng.',
            overview: 'Bảo tàng nổi tiếng với bộ sưu tập Impressionism và Post-Impressionism, nhưng điều làm trải nghiệm ở đây khác biệt là kiến trúc nhà ga cũ vẫn hiện diện trong từng nhịp dầm và ô cửa. Bạn vừa xem tranh vừa luôn cảm thấy mình đang đi trong một ga tàu đã được Paris hóa thành một nơi cực kỳ thanh lịch.',
            whyGo: 'Nếu Louvre cho cảm giác hùng vĩ thì Orsay cho cảm giác gần hơn, mềm hơn và rất dễ yêu. Đây là nơi lý tưởng để ghé nửa ngày rồi tản bộ dọc Seine.',
            bestMoment: 'Buổi sáng trong tuần hoặc cuối chiều để nối tiếp bằng một đoạn đi bộ sang Tuileries hay Saint-Germain.',
            routePlan: 'Chọn vài gallery yêu thích, ghé khu đồng hồ lớn rồi băng qua cầu sang Tuileries hoặc men về Saint-Germain-des-Prés.',
            nearby: 'Bờ Seine, Tuileries, Assemblée Nationale và khu Saint-Germain.',
            moods: ['Impressionism', 'Bờ Seine', 'Nhà ga cũ'],
            highlights: [
                { icon: 'fa-train-subway', title: 'Kiến trúc nhà ga tạo bản sắc riêng', text: 'Không gian dài, cao và mềm làm cho việc xem nghệ thuật ở Orsay rất khác những bảo tàng khác.' },
                { icon: 'fa-clock', title: 'Các ô đồng hồ là điểm nhìn rất đáng nhớ', text: 'Đây là nơi hiếm hoi bạn vừa nhìn ra Paris vừa cảm được lớp lịch sử công nghiệp của thành phố.' },
                { icon: 'fa-paintbrush', title: 'Nhịp tham quan dễ chịu hơn Louvre', text: 'Orsay cho cảm giác gần gũi hơn, rất hợp nếu bạn muốn một buổi nghệ thuật không quá dày.' }
            ],
            sourceLinks: [
                { label: 'Trang chính thức Musée d’Orsay', url: 'https://www.musee-orsay.fr/en' }
            ]
        },
        PA00086001: {
            slug: 'sainte-chapelle',
            shortName: 'Sainte-Chapelle',
            heroEyebrow: 'Kính màu huyền ảo',
            metaDescription: 'Sainte-Chapelle là viên ngọc Gothic của Ile de la Cite, nổi bật với 15 ô kính màu thế kỷ 13 và ánh sáng gần như siêu thực.',
            intro: 'Sainte-Chapelle không đồ sộ như Notre-Dame, nhưng hiệu ứng thị giác bên trong có thể khiến bạn lặng người nhanh hơn. Bước lên upper chapel, những bức tường gần như biến mất sau các mảng kính màu dựng thẳng lên trời, và ánh sáng trở thành nhân vật chính.',
            overview: 'Được Louis IX xây dựng ở thế kỷ 13 để lưu giữ các thánh tích quý, Sainte-Chapelle là một viên ngọc Gothic Rayonnant. Bộ 15 ô kính màu thế kỷ 13 kể lại câu chuyện Kinh Thánh bằng hàng nghìn mảng màu, khiến không gian vừa thiêng liêng vừa gần như siêu thực.',
            whyGo: 'Đây là nơi rất hợp cho những ai muốn thấy Paris tinh xảo thay vì chỉ hoành tráng. Chỉ cần chọn một ngày có nắng nhẹ, bạn sẽ hiểu vì sao nhiều người xem đây là không gian nội thất đẹp nhất thành phố.',
            bestMoment: 'Cuối buổi sáng hoặc đầu chiều nắng, khi ánh sáng xuyên qua kính màu rõ và sâu nhất.',
            routePlan: 'Ghép với Conciergerie, Notre-Dame và một vòng đi bộ quanh Île de la Cité để chuyến đi liền mạch.',
            nearby: 'Conciergerie, Notre-Dame, Pont Neuf và Khu Latin.',
            moods: ['Kính màu', 'Gothic', 'Île de la Cité'],
            highlights: [
                { icon: 'fa-sun', title: 'Ánh sáng là trải nghiệm chính', text: 'Sainte-Chapelle đẹp nhất khi mặt trời đủ mạnh để làm toàn bộ không gian đổi màu từng phút.' },
                { icon: 'fa-gem', title: '15 ô kính màu thế kỷ 13 là một kho báu thật sự', text: 'Những bức tường gần như được thay bằng kính, tạo cảm giác kiến trúc đang tan vào ánh sáng.' },
                { icon: 'fa-cross', title: 'Một công trình nhỏ nhưng độ choáng ngợp rất lớn', text: 'Chỉ cần vài phút trong upper chapel là đã đủ để thấy Paris có thể tinh xảo đến mức nào.' }
            ],
            sourceLinks: [
                { label: 'Trang chính thức Sainte-Chapelle', url: 'https://www.sainte-chapelle.fr/en/' }
            ]
        }
    });

    const DEFAULT_CENTER = Object.freeze([48.8566, 2.3522]);
    const DEFAULT_LIMIT = 10;

    function normalizeText(value) {
        return String(value || '')
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/đ/g, 'd')
            .toLowerCase();
    }

    function slugifyText(value, fallback) {
        const normalized = normalizeText(value)
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
        if (normalized) return normalized;
        const fallbackValue = normalizeText(fallback || 'paris')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-+|-+$/g, '');
        return fallbackValue || 'paris';
    }

    function isLocalUiContext(windowRef) {
        const targetWindow = windowRef || (typeof window !== 'undefined' ? window : null);
        if (!targetWindow || !targetWindow.location) return false;
        const protocol = String(targetWindow.location.protocol || '').toLowerCase();
        const hostname = String(targetWindow.location.hostname || '').toLowerCase();
        return protocol === 'file:'
            || hostname === 'localhost'
            || hostname === '127.0.0.1'
            || hostname === '::1'
            || hostname === '[::1]';
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function clamp(value, min, max) {
        return Math.min(max, Math.max(min, value));
    }

    function getScoreValue(scoreRaw) {
        const value = Number(scoreRaw);
        return Number.isFinite(value) ? clamp(value, 0, 1) : 0;
    }

    function getStarCount(scoreRaw) {
        const stars = Math.round(getScoreValue(scoreRaw) * 5);
        return clamp(stars || 1, 1, 5);
    }

    function formatRating(scoreRaw) {
        return `${(getScoreValue(scoreRaw) * 5).toFixed(1)}/5`;
    }

    function truncateText(value, maxLength) {
        const source = String(value || '').trim();
        if (!source || source.length <= maxLength) return source;
        const shortened = source.slice(0, Math.max(0, maxLength - 1)).replace(/\s+\S*$/, '').trim();
        return `${shortened || source.slice(0, maxLength - 1)}…`;
    }

    function toImagePath(reference) {
        return reference ? `assets/paris/images/${String(reference).toLowerCase()}.jpg` : '';
    }

    function buildFallbackImage(label, accent) {
        const svg = [
            "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 560'>",
            "<defs>",
            `<linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0%' stop-color='${String(accent || '#ff7a59')}'/><stop offset='100%' stop-color='#fff3df'/></linearGradient>`,
            '</defs>',
            "<rect width='800' height='560' fill='url(#g)'/>",
            "<circle cx='628' cy='116' r='84' fill='rgba(255,255,255,0.24)'/>",
            "<circle cx='134' cy='434' r='110' fill='rgba(255,255,255,0.2)'/>",
            "<path d='M148 410c76-112 146-170 212-170s136 58 212 170' fill='none' stroke='rgba(17,24,39,0.12)' stroke-width='16' stroke-linecap='round'/>",
            "<path d='M397 132l16 176h34l-24 34 10 108h-72l10-108-24-34h34l16-176Z' fill='rgba(17,24,39,0.2)'/>",
            "<text x='74' y='100' fill='#ffffff' font-size='26' font-family='Arial,sans-serif' font-weight='700'>Paris Spotlight</text>",
            `<text x='74' y='444' fill='#172033' font-size='54' font-family='Arial,sans-serif' font-weight='700'>${escapeHtml(String(label || 'Paris')).slice(0, 28)}</text>`,
            "<text x='74' y='490' fill='#243248' font-size='26' font-family='Arial,sans-serif'>Guide visuel SVP</text>",
            '</svg>'
        ].join('');

        return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
    }

    function isParisItem(item) {
        return normalizeText(item && item.commune_forme_index).includes('paris') ||
            normalizeText(item && item.address_vn).includes('paris');
    }

    function resolveAreaLabel(item) {
        const commune = String(item.commune_forme_index || '').trim();
        if (commune) return commune.split(';')[0].trim();
        const address = String(item.address_vn || '').trim();
        if (!address) return 'Paris';
        const districtMatch = address.match(/Qu[aạ]n\s+\d+\s*Paris/i);
        return districtMatch ? districtMatch[0] : address;
    }

    function resolveTheme(categoryRaw, editorial) {
        if (editorial) {
            return {
                color: editorial.accent,
                icon: editorial.icon,
                label: editorial.eyebrow
            };
        }

        const category = normalizeText(categoryRaw);
        if (category.includes('nha tho') || category.includes('vuong cung') || category.includes('nha nguyen')) {
            return { color: '#f59e0b', icon: 'fa-church', label: 'Tôn giáo' };
        }
        if (category.includes('opera') || category.includes('nha hat')) {
            return { color: '#d946ef', icon: 'fa-masks-theater', label: 'Nghệ thuật' };
        }
        if (category.includes('cung dien') || category.includes('bao tang') || category.includes('lau dai')) {
            return { color: '#2563eb', icon: 'fa-landmark-dome', label: 'Di sản' };
        }
        if (category.includes('khai hoan mon') || category.includes('tuong dai')) {
            return { color: '#f97316', icon: 'fa-monument', label: 'Biểu tượng' };
        }
        if (category.includes('nha ga')) {
            return { color: '#06b6d4', icon: 'fa-train-subway', label: 'Bờ sông' };
        }
        if (category.includes('cau')) {
            return { color: '#0ea5e9', icon: 'fa-bridge', label: 'Cầu' };
        }
        return { color: '#4f46e5', icon: 'fa-location-dot', label: 'Paris' };
    }

    function prepareMonuments(rawItems, options = {}) {
        const featuredOrder = Array.isArray(options.featuredOrder) ? options.featuredOrder : FEATURED_REFERENCE_ORDER;
        const featuredRankByRef = new Map(featuredOrder.map((reference, index) => [reference, index + 1]));
        const editorials = options.editorials || FEATURED_EDITORIAL;

        return (Array.isArray(rawItems) ? rawItems : [])
            .map((item) => ({
                ...item,
                __lat: Number(item && item.lat),
                __lon: Number(item && item.lon)
            }))
            .filter((item) => Number.isFinite(item.__lat) && Number.isFinite(item.__lon))
            .filter((item) => (options.includeAll ? true : isParisItem(item)))
            .map((item) => {
                const reference = String(item.reference || '').trim();
                const editorial = editorials[reference] || null;
                const theme = resolveTheme(item.category_vn, editorial);
                const teaserSource = editorial && editorial.teaser
                    ? editorial.teaser
                    : item.story_vn || item.description_vn || '';

                return {
                    ...item,
                    reference,
                    __featuredRank: featuredRankByRef.get(reference) || 0,
                    __editorial: editorial,
                    __score: getScoreValue(item.score),
                    __stars: getStarCount(item.score),
                    __areaLabel: resolveAreaLabel(item),
                    __imageSrc: item.imageUrl || toImagePath(reference),
                    __fallbackImage: buildFallbackImage(item.name_vn || 'Paris', theme.color),
                    __teaser: truncateText(teaserSource, 145),
                    __theme: theme
                };
            })
            .sort((left, right) => {
                if (left.__featuredRank && right.__featuredRank) return left.__featuredRank - right.__featuredRank;
                if (left.__featuredRank) return -1;
                if (right.__featuredRank) return 1;
                if (right.__score !== left.__score) return right.__score - left.__score;
                return String(left.name_vn || '').localeCompare(String(right.name_vn || ''), 'vi');
            });
    }

    function getFeaturedItems(items, limit = DEFAULT_LIMIT) {
        return (Array.isArray(items) ? items : [])
            .filter((item) => item.__featuredRank > 0)
            .sort((left, right) => left.__featuredRank - right.__featuredRank)
            .slice(0, limit);
    }

    function resolveBoundsBox(bounds) {
        if (!bounds) return null;

        if (typeof bounds.getSouthWest === 'function' && typeof bounds.getNorthEast === 'function') {
            const southWest = bounds.getSouthWest();
            const northEast = bounds.getNorthEast();
            const center = typeof bounds.getCenter === 'function'
                ? bounds.getCenter()
                : {
                    lat: (Number(southWest.lat) + Number(northEast.lat)) / 2,
                    lng: (Number(southWest.lng) + Number(northEast.lng)) / 2
                };

            return {
                south: Number(southWest.lat),
                west: Number(southWest.lng),
                north: Number(northEast.lat),
                east: Number(northEast.lng),
                center: { lat: Number(center.lat), lng: Number(center.lng) }
            };
        }

        if (
            Number.isFinite(Number(bounds.south)) &&
            Number.isFinite(Number(bounds.west)) &&
            Number.isFinite(Number(bounds.north)) &&
            Number.isFinite(Number(bounds.east))
        ) {
            const center = bounds.center || {
                lat: (Number(bounds.south) + Number(bounds.north)) / 2,
                lng: (Number(bounds.west) + Number(bounds.east)) / 2
            };

            return {
                south: Number(bounds.south),
                west: Number(bounds.west),
                north: Number(bounds.north),
                east: Number(bounds.east),
                center: { lat: Number(center.lat), lng: Number(center.lng) }
            };
        }

        return null;
    }

    function getDistanceScore(item, center) {
        const latDiff = Number(item.__lat) - Number(center.lat);
        const lonDiff = Number(item.__lon) - Number(center.lng);
        return (latDiff * latDiff) + (lonDiff * lonDiff);
    }

    function pickViewportItems(items, bounds, limit = DEFAULT_LIMIT) {
        const boundsBox = resolveBoundsBox(bounds);
        if (!boundsBox) return { visibleCount: 0, items: [] };

        const visibleItems = (Array.isArray(items) ? items : []).filter((item) =>
            item.__lat >= boundsBox.south &&
            item.__lat <= boundsBox.north &&
            item.__lon >= boundsBox.west &&
            item.__lon <= boundsBox.east
        );

        visibleItems.sort((left, right) => {
            if (right.__score !== left.__score) return right.__score - left.__score;
            if (Boolean(right.__featuredRank) !== Boolean(left.__featuredRank)) {
                return Number(Boolean(right.__featuredRank)) - Number(Boolean(left.__featuredRank));
            }
            return getDistanceScore(left, boundsBox.center) - getDistanceScore(right, boundsBox.center);
        });

        return {
            visibleCount: visibleItems.length,
            items: visibleItems.slice(0, limit)
        };
    }

    function buildDistrictSummary(items) {
        const counts = new Map();
        (Array.isArray(items) ? items : []).forEach((item) => {
            const label = item.__areaLabel || 'Paris';
            counts.set(label, (counts.get(label) || 0) + 1);
        });

        return Array.from(counts.entries())
            .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0], 'vi'))
            .slice(0, 5)
            .map(([label, count]) => ({ label, count }));
    }

    function findItemByReference(items, reference) {
        return (Array.isArray(items) ? items : []).find((item) => item.reference === reference) || null;
    }

    function getParisPlaceSlug(reference) {
        const detail = PARIS_PLACE_DETAILS[String(reference || '').trim()];
        if (detail && detail.slug) return detail.slug;
        const item = findItemByReference(FEATURED_BOOTSTRAP_ITEMS, reference);
        if (!item) return '';
        return slugifyText(item.name_vn || item.reference || 'paris');
    }

    function buildParisPlaceHref(value, options = {}) {
        let slug = '';
        if (value && typeof value === 'object') {
            slug = String(value.slug || '').trim() || getParisPlaceSlug(value.reference) || slugifyText(value.name_vn || '');
        } else {
            const raw = String(value || '').trim();
            slug = PARIS_PLACE_DETAILS[raw]
                ? getParisPlaceSlug(raw)
                : slugifyText(raw, '');
        }
        if (!slug) return '';

        const routePrefix = `ban-do-paris/${slug}/`;
        const windowRef = options.window || null;
        return isLocalUiContext(windowRef) ? `${routePrefix}index.html` : routePrefix;
    }

    function getParisPlaceDetailByReference(reference, options = {}) {
        const item = findItemByReference(FEATURED_BOOTSTRAP_ITEMS, reference);
        const detail = PARIS_PLACE_DETAILS[String(reference || '').trim()];
        if (!item || !detail) return null;

        const editorial = FEATURED_EDITORIAL[item.reference] || null;
        const theme = resolveTheme(item.category_vn, editorial);
        const slug = getParisPlaceSlug(item.reference);

        return {
            ...item,
            ...detail,
            slug,
            shortName: detail.shortName || item.name_vn || 'Điểm Paris',
            routeHref: buildParisPlaceHref(slug, options),
            imageSrc: toImagePath(item.reference),
            theme,
            editorial,
            areaLabel: item.commune_forme_index || item.address_vn || 'Paris',
            ratingLabel: formatRating(item.score)
        };
    }

    function getParisPlaceDetailBySlug(slug, options = {}) {
        const normalizedSlug = slugifyText(slug, '');
        if (!normalizedSlug) return null;

        const matchingReference = FEATURED_REFERENCE_ORDER.find((reference) => getParisPlaceSlug(reference) === normalizedSlug);
        return matchingReference ? getParisPlaceDetailByReference(matchingReference, options) : null;
    }

    function getRelatedParisPlaces(reference, limit = 3, options = {}) {
        const maxItems = Number.isFinite(Number(limit)) ? Math.max(0, Math.trunc(limit)) : 3;
        return FEATURED_REFERENCE_ORDER
            .filter((candidateReference) => candidateReference !== reference)
            .slice(0, maxItems)
            .map((candidateReference) => getParisPlaceDetailByReference(candidateReference, options))
            .filter(Boolean);
    }

    function buildMarkerHtml(item, index, active, mode) {
        const rank = mode === 'featured' && item.__featuredRank ? item.__featuredRank : index + 1;
        return `
            <div class="sv-paris-marker${active ? ' sv-paris-marker--active' : ''}" style="--marker-accent:${escapeHtml(item.__theme.color)};">
                <span class="sv-paris-marker__rank">${String(rank).padStart(2, '0')}</span>
                <span class="sv-paris-marker__icon"><i class="fa-solid ${escapeHtml(item.__theme.icon)}"></i></span>
            </div>
        `;
    }

    function buildPopupHtml(item, windowRef) {
        const detailHref = buildParisPlaceHref(item, { window: windowRef });
        return `
            <div class="sv-paris-popup">
                <div class="sv-paris-popup__eyebrow">${escapeHtml(item.__editorial ? item.__editorial.eyebrow : item.__theme.label)}</div>
                <div class="sv-paris-popup__title">${escapeHtml(item.name_vn || 'Điểm Paris')}</div>
                <div class="sv-paris-popup__meta">${escapeHtml(item.__areaLabel || item.address_vn || 'Paris')}</div>
                <div class="sv-paris-popup__desc">${escapeHtml(item.__teaser || 'Chưa có mô tả')}</div>
                <a class="sv-paris-popup__link" href="${escapeHtml(detailHref)}">Mở guide chi tiết <i class="fa-solid fa-arrow-right"></i></a>
            </div>
        `;
    }

    function buildPoiCardHtml(item, index, active, mode, windowRef) {
        const rank = mode === 'featured' && item.__featuredRank ? item.__featuredRank : index + 1;
        const detailHref = buildParisPlaceHref(item, { window: windowRef });
        return `
            <a class="sv-paris-poi${active ? ' sv-paris-poi--active' : ''}" href="${escapeHtml(detailHref)}" data-reference="${escapeHtml(item.reference)}" style="--poi-accent:${escapeHtml(item.__theme.color)};">
                <span class="sv-paris-poi__media">
                    <img class="sv-paris-poi__image" src="${escapeHtml(item.__imageSrc || item.__fallbackImage)}" alt="${escapeHtml(item.name_vn || 'Ảnh Paris')}" loading="lazy" decoding="async" data-fallback-src="${escapeHtml(item.__fallbackImage)}" />
                    <span class="sv-paris-poi__rank">${String(rank).padStart(2, '0')}</span>
                </span>
                <span class="sv-paris-poi__body">
                    <span class="sv-paris-poi__eyebrow">${escapeHtml(item.__editorial ? item.__editorial.eyebrow : item.__theme.label)}</span>
                    <span class="sv-paris-poi__title">${escapeHtml(item.name_vn || 'Điểm Paris')}</span>
                    <span class="sv-paris-poi__meta"><i class="fa-solid fa-location-dot"></i>${escapeHtml(item.__areaLabel || item.address_vn || 'Paris')}</span>
                    <span class="sv-paris-poi__desc">${escapeHtml(item.__teaser || 'Chưa có mô tả')}</span>
                    <span class="sv-paris-poi__footer">
                        <span class="sv-paris-chip"><i class="fa-solid ${escapeHtml(item.__theme.icon)}"></i>${escapeHtml(item.__theme.label)}</span>
                        <span class="sv-paris-rating"><i class="fa-solid fa-star"></i>${escapeHtml(formatRating(item.score))}</span>
                        <span class="sv-paris-poi__cta">Đọc guide <i class="fa-solid fa-arrow-right"></i></span>
                    </span>
                </span>
            </a>
        `;
    }

    function createParisMapApp(options = {}) {
        const documentRef = options.document || (typeof document !== 'undefined' ? document : null);
        const windowRef = options.window || (typeof window !== 'undefined' ? window : null);
        const leaflet = options.L || (windowRef ? windowRef.L : null);
        const fetchFn = options.fetch || (windowRef && windowRef.fetch ? windowRef.fetch.bind(windowRef) : null);

        if (!documentRef || !windowRef || !leaflet || !fetchFn) {
            throw new Error('Paris map app requires window, document, Leaflet, and fetch.');
        }

        const mapElement = documentRef.getElementById(options.mapElementId || 'parisMap');
        const poiListElement = documentRef.getElementById(options.poiListElementId || 'parisPoiList');
        const modeEyebrowElement = documentRef.getElementById(options.modeEyebrowElementId || 'parisModeEyebrow');
        const modeTitleElement = documentRef.getElementById(options.modeTitleElementId || 'parisModeTitle');
        const modeSubtitleElement = documentRef.getElementById(options.modeSubtitleElementId || 'parisModeSubtitle');
        const summaryElement = documentRef.getElementById(options.summaryElementId || 'parisViewportSummary');
        const districtElement = documentRef.getElementById(options.districtElementId || 'parisDistrictChips');
        const mapMetaElement = documentRef.getElementById(options.mapMetaElementId || 'parisMapMeta');
        const resetButtons = Array.from(documentRef.querySelectorAll('[data-reset-featured]'));

        if (!mapElement || !poiListElement || !mapMetaElement) {
            throw new Error('Paris map app cannot find required DOM elements.');
        }

        const state = {
            map: null,
            markersByReference: new Map(),
            allItems: prepareMonuments(options.bootstrapItems || FEATURED_BOOTSTRAP_ITEMS),
            viewItems: [],
            activeReference: '',
            mode: 'featured',
            visibleCount: 0,
            datasetPhase: 'bootstrap',
            pendingProgrammaticMoves: 0
        };

        function getDatasetNote() {
            if (state.datasetPhase === 'bootstrap') return 'Đang nạp toàn bộ dữ liệu Paris trong nền.';
            if (state.datasetPhase === 'error') return 'Không tải được dữ liệu mở rộng, hiện chỉ giữ Top 10 mở màn.';
            return `Nguồn nền đã sẵn sàng với ${state.allItems.length} POI Paris.`;
        }

        function renderDistrictChips() {
            if (!districtElement) return;
            const districts = buildDistrictSummary(state.viewItems);
            districtElement.innerHTML = districts.length
                ? districts.map((item) => `<span class="sv-paris-district"><strong>${item.count}</strong>${escapeHtml(item.label)}</span>`).join('')
                : '<span class="sv-paris-district__empty">Kéo map để lấy danh sách mới theo khu vực.</span>';
        }

        function renderSummary() {
            if (state.mode === 'featured') {
                if (modeEyebrowElement) modeEyebrowElement.textContent = 'Mở màn tự động';
                if (modeTitleElement) modeTitleElement.textContent = '10 điểm đẹp nhất Paris';
                if (modeSubtitleElement) modeSubtitleElement.textContent = 'Bản đồ bên phải đang zoom đúng 10 biểu tượng mở màn. Nhấn marker để preview nhanh, hoặc nhấn thẻ bên trái để mở guide chi tiết của từng địa điểm.';
                if (summaryElement) summaryElement.innerHTML = `<strong>${state.viewItems.length}</strong> điểm đang được spotlight. ${escapeHtml(getDatasetNote())}`;
                mapMetaElement.textContent = 'Spotlight hiện tại: Top 10 biểu tượng';
                return;
            }

            if (!state.viewItems.length) {
                if (modeEyebrowElement) modeEyebrowElement.textContent = 'Theo khung nhìn';
                if (modeTitleElement) modeTitleElement.textContent = 'Khung nhìn này chưa có POI nổi bật';
                if (modeSubtitleElement) modeSubtitleElement.textContent = 'Kéo lại về trung tâm Paris hoặc bấm Top 10 để trở lại bộ mở màn.';
                if (summaryElement) summaryElement.innerHTML = escapeHtml(getDatasetNote());
                mapMetaElement.textContent = 'Không có POI trong viewport';
                return;
            }

            if (modeEyebrowElement) modeEyebrowElement.textContent = 'Theo khung nhìn';
            if (modeTitleElement) modeTitleElement.textContent = `${state.viewItems.length} điểm nổi bật trong vùng bạn đang xem`;
            if (modeSubtitleElement) modeSubtitleElement.textContent = 'Danh sách bên trái tự làm mới sau mỗi lần bạn pan hoặc zoom map. Hệ thống giữ 10 điểm nổi bật nhất trong viewport hiện tại.';
            if (summaryElement) summaryElement.innerHTML = `<strong>${state.viewItems.length}</strong> / <strong>${state.visibleCount}</strong> POI trong khung nhìn đang được đưa lên danh sách. ${escapeHtml(getDatasetNote())}`;
            mapMetaElement.textContent = `${state.visibleCount} POI trong viewport`;
        }

        function installImageFallbacks() {
            poiListElement.querySelectorAll('img[data-fallback-src]').forEach((image) => {
                image.addEventListener('error', () => {
                    const fallbackSource = image.getAttribute('data-fallback-src');
                    if (fallbackSource && image.getAttribute('src') !== fallbackSource) {
                        image.setAttribute('src', fallbackSource);
                    }
                }, { once: true });
            });
        }

        function scrollCardIntoView(reference) {
            const target = Array.from(poiListElement.querySelectorAll('[data-reference]'))
                .find((element) => element.getAttribute('data-reference') === reference);
            if (target && typeof target.scrollIntoView === 'function') {
                target.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }

        function clearMarkers() {
            state.markersByReference.forEach((marker) => {
                if (state.map && typeof state.map.removeLayer === 'function') {
                    state.map.removeLayer(marker);
                }
            });
            state.markersByReference.clear();
        }

        function createMarker(item, index) {
            const marker = leaflet.marker([item.__lat, item.__lon], {
                icon: leaflet.divIcon({
                    className: 'sv-paris-marker-shell',
                    html: buildMarkerHtml(item, index, state.activeReference === item.reference, state.mode),
                    iconSize: [64, 64],
                    iconAnchor: [32, 60],
                    popupAnchor: [0, -42]
                }),
                title: item.name_vn || 'Paris'
            });

            if (typeof marker.bindPopup === 'function') marker.bindPopup(buildPopupHtml(item, windowRef));
            if (typeof marker.on === 'function') {
                marker.on('click', () => {
                    setActiveReference(item.reference, {
                        centerMap: false,
                        scrollToCard: true,
                        openPopup: true
                    });
                });
            }
            return marker;
        }

        function renderMarkers(openPopupReference) {
            clearMarkers();
            state.viewItems.forEach((item, index) => {
                const marker = createMarker(item, index);
                state.markersByReference.set(item.reference, marker);
                if (typeof marker.addTo === 'function') marker.addTo(state.map);
            });

            const popupTarget = openPopupReference && state.markersByReference.get(openPopupReference);
            if (popupTarget && typeof popupTarget.openPopup === 'function') popupTarget.openPopup();
        }

        function renderPoiList(scrollReference) {
            if (!state.viewItems.length) {
                poiListElement.innerHTML = `
                    <div class="sv-paris-empty">
                        <div class="sv-paris-empty__icon"><i class="fa-solid fa-compass-drafting"></i></div>
                        <h3>Chưa có điểm nổi bật trong vùng đang xem</h3>
                        <p>Hãy kéo bản đồ về khu trung tâm hoặc bấm nút Top 10 để quay lại hành trình mở màn.</p>
                    </div>
                `;
                return;
            }

            poiListElement.innerHTML = state.viewItems
                .map((item, index) => buildPoiCardHtml(item, index, item.reference === state.activeReference, state.mode, windowRef))
                .join('');

            installImageFallbacks();
            if (scrollReference) scrollCardIntoView(scrollReference);
        }

        function fitMapToItems(items) {
            if (!state.map || !items.length || typeof state.map.fitBounds !== 'function') return;
            state.pendingProgrammaticMoves += 1;
            state.map.fitBounds(items.map((item) => [item.__lat, item.__lon]), {
                padding: [52, 52],
                maxZoom: 13
            });
        }

        function applyView(mode, items, options = {}) {
            state.mode = mode;
            state.viewItems = Array.isArray(items) ? items.slice() : [];
            state.visibleCount = Number.isFinite(Number(options.visibleCount)) ? Number(options.visibleCount) : state.viewItems.length;

            const preserveActive = options.preserveActive && findItemByReference(state.viewItems, state.activeReference);
            state.activeReference = preserveActive
                ? state.activeReference
                : (state.viewItems[0] ? state.viewItems[0].reference : '');

            renderSummary();
            renderDistrictChips();
            renderPoiList(options.scrollToCard ? state.activeReference : '');
            renderMarkers(options.openPopupReference || '');

            if (options.fitBounds) fitMapToItems(state.viewItems);
        }

        function setActiveReference(reference, options = {}) {
            const item = findItemByReference(state.viewItems, reference);
            if (!item) return;

            state.activeReference = reference;
            renderPoiList(options.scrollToCard ? reference : '');
            renderMarkers(options.openPopup ? reference : '');

            if (options.centerMap && state.map) {
                const targetZoom = Math.max(Number(state.map.getZoom && state.map.getZoom()) || 13, 14);
                state.pendingProgrammaticMoves += 1;
                if (typeof state.map.flyTo === 'function') {
                    state.map.flyTo([item.__lat, item.__lon], targetZoom, {
                        animate: true,
                        duration: 0.85
                    });
                } else if (typeof state.map.setView === 'function') {
                    state.map.setView([item.__lat, item.__lon], targetZoom);
                }
            }
        }

        function goToFeatured() {
            applyView('featured', getFeaturedItems(state.allItems), {
                preserveActive: true,
                fitBounds: true
            });
        }

        function refreshFromViewport() {
            if (!state.map || typeof state.map.getBounds !== 'function') return;
            const result = pickViewportItems(state.allItems, state.map.getBounds(), DEFAULT_LIMIT);
            applyView('viewport', result.items, {
                visibleCount: result.visibleCount,
                preserveActive: true
            });
        }

        async function loadFullDataset() {
            try {
                const response = await fetchFn('assets/paris/monuments.json', { cache: 'force-cache' });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const prepared = prepareMonuments(await response.json());
                if (!prepared.length) throw new Error('No valid Paris POI found.');

                state.allItems = prepared;
                state.datasetPhase = 'ready';

                if (state.mode === 'featured') {
                    applyView('featured', getFeaturedItems(state.allItems), {
                        preserveActive: true
                    });
                    return;
                }

                refreshFromViewport();
            } catch (error) {
                state.datasetPhase = 'error';
                renderSummary();
            }
        }

        function bindEvents() {
            resetButtons.forEach((button) => {
                button.addEventListener('click', () => {
                    goToFeatured();
                });
            });

            state.map.on('moveend', () => {
                if (state.pendingProgrammaticMoves > 0) {
                    state.pendingProgrammaticMoves -= 1;
                    return;
                }
                refreshFromViewport();
            });
        }

        function initMap() {
            state.map = leaflet.map(mapElement, {
                zoomControl: true,
                minZoom: 11,
                maxZoom: 18,
                scrollWheelZoom: true
            });

            if (typeof state.map.setView === 'function') {
                state.map.setView(DEFAULT_CENTER, 12);
            }

            const tileLayer = leaflet.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
                subdomains: 'abcd',
                maxZoom: 20,
                attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
            });
            if (tileLayer && typeof tileLayer.addTo === 'function') tileLayer.addTo(state.map);
        }

        async function init() {
            initMap();
            bindEvents();
            goToFeatured();
            await loadFullDataset();
            return state;
        }

        return {
            init,
            goToFeatured,
            refreshFromViewport,
            setActiveReference,
            state
        };
    }

    return {
        FEATURED_BOOTSTRAP_ITEMS,
        FEATURED_EDITORIAL,
        FEATURED_REFERENCE_ORDER,
        PARIS_PLACE_DETAILS,
        buildDistrictSummary,
        buildParisPlaceHref,
        createParisMapApp,
        getParisPlaceDetailByReference,
        getParisPlaceDetailBySlug,
        getRelatedParisPlaces,
        getFeaturedItems,
        pickViewportItems,
        prepareMonuments
    };
});
