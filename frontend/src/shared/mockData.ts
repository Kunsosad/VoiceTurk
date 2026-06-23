import { Campaign, Recording, Certificate, ContributorAgreement } from './types';

export const mockCampaigns: Campaign[] = [
  {
    id: 'campaign-1',
    name: 'Tập dữ liệu Khiếu nại Quà tặng Livestream',
    description: 'Khách hàng AI đóng vai một người mua livestream bực bội vì thiếu quà tặng đã hứa. Cộng tác viên phản hồi trong vai trò chăm sóc khách hàng.',
    context: 'Khách mua mỹ phẩm qua livestream, được hứa có quà tặng mini nhưng khi nhận hàng lại không có. Khách nghi shop lừa và muốn được xử lý ngay.',
    aiCustomerRole: 'Khách hàng đang bực, nghi ngờ shop và muốn được giải thích hoặc hoàn tiền lập tức.',
    contributorRole: 'Người chăm sóc khách hàng của shop, lịch sự, xoa dịu khách và đưa ra phương án xử lý thỏa đáng.',
    boundary: 'Tối đa 5 lượt mỗi bên. Thời lượng âm thanh từ 15 giây đến 90 giây.',
    conversationLimit: 'Tối đa 5 lượt mỗi bên',
    reviewGuide: [
      'Giọng nói rõ ràng, dễ nghe với âm lượng đầy đủ',
      'Luồng cuộc nói chuyện nhạy bén và tự nhiên',
      'Cộng tác viên đóng đúng vai trò chăm sóc khách hàng chỉ định',
      'Cộng tác viên xử lý tình huống linh hoạt và lịch sự',
      'Cộng tác viên không hứa hẹn điều gì làm tổn hại uy tín thương hiệu'
    ],
    targetRecordings: 60,
    targetAcceptedRecordings: 60,
    acceptedRecordings: 24,
    pendingReviewCount: 7,
    retakeCount: 4,
    retakeRequestedCount: 4,
    rejectedCount: 2,
    pricePerRecording: 8000,
    payoutAccrued: 192000, // 24 * 8000
    platformFee: 48000,
    totalBudget: 528000,
    securedBudget: 528000,
    status: 'Active',
    dateCreated: '2026-06-15T14:30:00Z',
    proofStatus: 'Verified',
    chatHistory: [
      {
        sender: 'ai',
        text: 'Xin chào Vy Tran! Tôi là VoiceBot kiến tạo kịch bản. Hãy cùng thiết lập chiến dịch thu thập mẫu đàm thoại bằng giọng nói tự nhiên nhé. Trước hết, bối cảnh đàm thoại đền bù livestream nào bạn muốn giả lập?',
        timestamp: '14:15'
      },
      {
        sender: 'user',
        text: 'Tôi cần kịch bản về khách hàng mua mỹ phẩm qua livestream bị thiếu quà tặng mini đi kèm.',
        timestamp: '14:16'
      },
      {
        sender: 'ai',
        text: 'Tuyệt vời, tôi đã ghi nhận bối cảnh livestream mỹ phẩm. Tiếp theo, dòng sản phẩm này thuộc nhóm ngành cốt lõi nào?',
        timestamp: '14:17'
      },
      {
        sender: 'user',
        text: 'Mỹ phẩm và Chăm sóc thẩm mỹ cao cấp nhé.',
        timestamp: '14:18'
      },
      {
        sender: 'ai',
        text: 'Rất hay! Để mô phỏng khách đàm thoại sinh động nhất, nhân vật khách hàng (do AI thủ vai) nên biểu hiện tâm trạng bực tức như thế nào?',
        timestamp: '14:18'
      },
      {
        sender: 'user',
        text: 'Khách hàng cực kỳ giận dữ, nghi ngờ shop lừa dối khách hàng, đòi đền bù tức thì.',
        timestamp: '14:19'
      },
      {
        sender: 'ai',
        text: 'Thách thức rất sát thực tế! Về phía người nói đóng góp (Contributor), họ sẽ ứng phó bằng vai trò CSKH giải quyết khiếu nại phải không?',
        timestamp: '14:20'
      },
      {
        sender: 'user',
        text: 'Đúng vậy, chuyên viên CSKH điềm tĩnh, giải quyết đền bù quà tặng cho khách.',
        timestamp: '14:21'
      },
      {
        sender: 'ai',
        text: 'Câu hỏi cuối, bạn muốn thu thập bao nhiêu tệp đàm thoại hoàn chỉnh chất lượng cao?',
        timestamp: '14:22'
      },
      {
        sender: 'user',
        text: 'Mục tiêu là 60 tệp đàm thoại sạch chất lượng cao.',
        timestamp: '14:23'
      },
      {
        sender: 'ai',
        text: 'Thông số đã được tối ưu hóa toàn vẹn thành Dataset Blueprint!',
        timestamp: '14:24'
      }
    ]
  }
];

export const mockRecordings: Recording[] = [
  {
    id: 'rec-1',
    campaignId: 'campaign-1',
    campaignName: 'Tập dữ liệu Khiếu nại Quà tặng Livestream',
    contributorName: 'Thơ Nguyen',
    recordedTime: 'Today, 14:32',
    duration: '1m 12s',
    status: 'Pending review',
    rewardAmount: 8000,
    quality: 'Good (No noise)',
    contextSnapshot: 'Thiếu quà livestream mỹ phẩm · khách giận đòi đền bù hỏa tốc.',
    audioDurationSec: 72,
    customerContext: 'Khách hàng mua set kem chống nắng trị giá 850.000đ từ buổi phát trực tiếp, được hứa tặng kèm một nón rộng vành đi biển nhưng khi mở hộp không thấy có quà.',
    agentContext: 'Điện thoại viên điềm tĩnh lắng nghe khiếu nại, giải thích sự cố hết quà đột xuất, đề xuất tặng điểm thành viên gấp đôi và gửi một hộp bông tẩy trang cotton thay thế.',
    useCaseDomain: 'Chăm sóc khách hàng ngành Mỹ phẩm Thẩm mỹ - Giải quyết thiếu phụ kiện quà tặng livestream bán lẻ.',
    transcript: '[AI - Khách hàng]: Chào em, chị vừa nhận được hộp kem chống nắng bên mình giao hồi nãy xong. Nhưng sao chị khui ra tìm hoài không thấy cái nón đi biển tặng kèm vậy? Lúc chốt trên livestream cam kết có quà mà?\n[Contributor - CSKH]: Dạ em chào chị ạ. Em xin lỗi chị rất nhiều vì sự thiếu sót trong khâu đóng gói này khiến mình phải phiền lòng ạ. Chị vui lòng cho em xin số điện thoại đặt hàng để em tra soát trên hệ thống liền nha chị.\n[AI - Khách hàng]: Số của chị là 0912345678, chị đặt tên Thơ Nguyễn. Mấy đứa làm ăn kiểu gì vậy, bán hàng cam kết thế nào thì phải giao thế ấy chứ, hay lại treo đầu dê bán thịt chó?\n[Contributor - CSKH]: Dạ chị Thơ ơi, em kiểm tra thấy đơn của mình rồi ạ. Dạ do buổi phát trực tiếp hôm đó lượt đơn tăng đột biến làm kho bị quá tải nón tặng kèm, các bạn đóng gói đã sơ suất không báo lại để điền quà thay đổi cho mình ạ. Em xin phép gửi bù ngay cho chị một chai serum mini dưỡng ẩm hoặc một hộp bông tẩy trang cao cấp thay thế kèm mã voucher 50.000đ được không ạ? Mong chị lượng thứ cho sơ suất này của shop ạ.'
  },
  {
    id: 'rec-2',
    campaignId: 'campaign-1',
    campaignName: 'Tập dữ liệu Khiếu nại Quà tặng Livestream',
    contributorName: 'Huy Hoang',
    recordedTime: 'Today, 13:15',
    duration: '0m 45s',
    status: 'Pending review',
    rewardAmount: 8000,
    quality: 'Excellent',
    contextSnapshot: 'Thiếu quà tặng dưỡng da mini · khách nghi ngờ chất lượng uy tín cửa hàng.',
    audioDurationSec: 45,
    customerContext: 'Khách mua lọ serum phục hồi da, shop cam kết tặng thêm lọ mini 5ml. Hàng giao tới chỉ có chai chính, khách nghi ngờ shop cố tình bớt quà để trục lợi.',
    agentContext: 'Nhân viên lễ phép giải quyết khiếu nại, đề nghị gửi tặng kèm mã miễn phí vận chuyển cho đơn tiếp theo và chuyển phát nhanh quà còn sót trong ngày.',
    useCaseDomain: 'Xử lý khiếu nại dịch vụ sau bán lẻ - Tặng quà tri ân mỹ phẩm cao cấp.',
    transcript: '[AI - Khách hàng]: Shop ơi, sao tôi mua chai serum dưỡng da phục hồi mà không thấy tặng kèm tuýp kem mini hồi tối livestream hứa hẹn vậy? Shop bán hàng không uy tín thế chịu sao được?\n[Contributor - CSKH]: Dạ em rất xin lỗi anh vì trải nghiệm mua sắm không được như ý lần này ạ. Dạ anh có thể cho em xin mã đơn hàng in trên phiếu giao để em đối chiếu với bộ phận kho được không ạ?\n[AI - Khách hàng]: Mã của tôi là HD-7762. Tôi cần bên bạn phản hồi sớm chứ bỏ tiền ra mua mà cứ như bị lừa đảo thế này mệt mỏi quá.\n[Contributor - CSKH]: Dạ anh Hoàng ơi, em đã xác minh hóa đơn của mình đúng là có quà tặng kèm ạ. Dạ shop cam kết hoàn toàn không có ý gian dối khách hàng đâu ạ, đây hoàn toàn là lỗi đóng gói thủ công của nhân viên kho mới. Em xin phép đóng gói gửi bù hỏa tốc món quà kèm lời xin lỗi thành khẩn từ shop ngay chiều nay ạ.'
  },
  {
    id: 'rec-3',
    campaignId: 'campaign-1',
    campaignName: 'Tập dữ liệu Khiếu nại Quà tặng Livestream',
    contributorName: 'Phuong Anh',
    recordedTime: 'Today, 11:20',
    duration: '1m 05s',
    status: 'Pending review',
    rewardAmount: 8000,
    quality: 'Good',
    contextSnapshot: 'Lỗi đóng hàng thiếu cọ trang điểm · khách đòi hoàn tiền một phần đơn.',
    audioDurationSec: 65,
    customerContext: 'Người mua phấn phủ kiềm dầu kèm quà tặng cọ phủ phấn cán gỗ, nhận hàng thiếu cọ, đòi hoàn tiền tương ứng 50.000đ vì không muốn chờ nhận gửi bù phiền phức.',
    agentContext: 'Điện thoại viên linh hoạt thỏa thuận, giải thích quy chế không hoàn tiền mặt cho quà tặng nhưng bù lại đồng ý quy đổi thành voucher trị giá 70.000đ áp dụng ngay lập tức cho toàn bộ sản phẩm.',
    useCaseDomain: 'Chăm sóc và thương lượng bồi hoàn thương mại điện tử mỹ phẩm.',
    transcript: '[AI - Khách hàng]: Alo shop hả, đơn hàng phấn phủ của mình nhận bị thiếu mất cái cọ phủ phấn rồi. Giờ chị không muốn các em gửi bù gì hết phiền phức lắm, thối lại cho chị 50 ngàn tiền mặt đi cho nhanh gọn.\n[Contributor - CSKH]: Dạ em xin chào chị Phương Anh ạ. Em rất tiếc vì sự cố đóng gói này đã gây phiền hà cho mình ạ. Dạ theo quy định của bên em thì quà tặng kèm không có giá trị quy đổi ra tiền mặt trực tiếp ạ, mong chị thông cảm giúp em.\n[AI - Khách hàng]: Kỳ cục vậy, lỗi của shop mà giờ tôi phải chịu sao? Không trả tiền thì tôi đánh giá 1 sao trên sàn cho biết tay đấy nhé!\n[Contributor - CSKH]: Dạ chị ơi, em hiểu sự bực bội của mình ạ. Để bù đắp, em xin phép gửi tặng chị voucher giảm giá trực tiếp 70.000đ áp dụng cho mọi sản phẩm mà không giới hạn thời gian sử dụng ạ. Hoặc nếu chị vẫn cần cọ, em gửi ship hỏa tốc giao tận tay cho mình chỉ trong 24 tiếng mà chị không tốn bất kỳ chi phí nào đâu ạ. Chị xem gợi ý nào tiện hơn cho mình nhé ạ.'
  },
  {
    id: 'rec-4',
    campaignId: 'campaign-1',
    campaignName: 'Tập dữ liệu Khiếu nại Quà tặng Livestream',
    contributorName: 'Duc Manh',
    recordedTime: 'Yesterday, 18:40',
    duration: '1m 24s',
    status: 'Pending review',
    rewardAmount: 8000,
    quality: 'Acceptable',
    contextSnapshot: 'Mỹ phẩm lỗi nhãn mác bảo hành quảng cáo livestream.',
    audioDurationSec: 84,
    customerContext: 'Khách hàng mua kem dưỡng mắt chống nhãn nhăn, lúc live bảo có tem chống giả và quà tặng túi canvas đựng mỹ phẩm, giao đến thiếu túi và tem bị rách.',
    agentContext: 'CSKH giải thích tem rách do ma sát vận chuyển, cam kết hàng chính hãng có mã số điện tử quét QR, đồng thời gửi bù túi canvas hỏa tốc.',
    useCaseDomain: 'Thẩm định chất lượng hàng hóa và giải quyết bất cập đóng gói Logistics mỹ phẩm.',
    transcript: '[AI - Khách hàng]: Chào em, anh đặt mua hũ kem dưỡng mắt hôm trước. Hàng nhận được thì tem chống hàng giả bị rách làm đôi, túi canvas tặng kèm cũng không có luôn. Ủa shop bán hàng fake hay sao mà tem rách nát vậy?\n[Contributor - CSKH]: Dạ em chào anh Mạnh ạ. Shop cam kết 100% chỉ bán hàng chính hãng phân phối độc quyền thôi ạ. Về phần tem bị trầy rách, rất có thể do quá trình vận chuyển bưu tá lưu kho đè ép cọ sát hộp giấy ạ. Anh có thể cào nhẹ lớp bạc quét mã QR bên hông hộp để kiểm tra mã số chính hãng điện tử trên trang chủ nha anh.\n[AI - Khách hàng]: Rồi còn cái túi canvas tặng kèm của tôi đâu? Quảng cáo rầm rộ rồi quên bẵng đi là sao?\n[Contributor - CSKH]: Dạ em xin lỗi anh vì lỗi thiếu quà tặng túi canvas này ạ. Do nhân viên sắp xếp kho sót lại phân khúc quà. Em xin phép tạo đơn chuyển phát nhanh chuyển thẳng chiếc túi canvas mới cứng kèm một tuýp mặt nạ ngủ mini tặng thêm để tạ lỗi gửi đến địa chỉ của mình ngay ngày mai nha anh.'
  },
  {
    id: 'rec-5',
    campaignId: 'campaign-1',
    campaignName: 'Tập dữ liệu Khiếu nại Quà tặng Livestream',
    contributorName: 'Lan Huong',
    recordedTime: 'Yesterday, 16:11',
    duration: '0m 58s',
    status: 'Pending review',
    rewardAmount: 8000,
    quality: 'Excellent',
    contextSnapshot: 'Khách mua son nước bị thiếu quà son bóng mini dưỡng ẩm.',
    audioDurationSec: 58,
    customerContext: 'Khách mua son tint bóng lì dịp Mega Sale, được hứa tặng son bóng mini 2ml trải nghiệm. Giao hàng thiếu quà tặng, khách đòi trả hàng hoàn tiền toàn bộ.',
    agentContext: 'CSKH xoa dịu khách, thuyết phục giữ lại sản phẩm chính cực tốt và gửi bù gấp bộ quà tặng xịn hơn ban đầu kèm lời thư tay xin lỗi từ nhà sáng lập thương hiệu.',
    useCaseDomain: 'Giải quyết trả hàng hoàn tiền (Return & Refund) trong bán lẻ mỹ phẩm trực tuyến.',
    transcript: '[AI - Khách hàng]: Em ơi chị muốn yêu cầu trả hàng hoàn tiền cho đơn hàng son tint bóng nhe. Chị mua vì quả son bóng mini tặng kèm mà giờ nhận được mỗi cây son lớn, chẳng thấy quà đâu cả.\n[Contributor - CSKH]: Dạ em chào chị Hương ạ. Em rất lấy làm tiếc khi khâu đóng hàng của bên em đã làm chị thất vọng. Cây son tint lì lớn chị nhận màu sắc và chất son có ưng ý không chị yêu?\n[AI - Khách hàng]: Chất son với màu son thì đẹp thật, nhưng chị ghét cái kiểu hứa lèo không giao quà ấy. Thôi làm thủ tục thu hồi hàng hoàn tiền cho chị đi.\n[Contributor - CSKH]: Dạ chị ơi, cây son đó là phiên bản giới hạn đang cháy hàng dữ lắm, nếu hoàn về thì tiếc cho mình lắm ạ. Chị giữ lại trải nghiệm giúp em nha. Em xin phép gửi bù gấp cây son bóng dưỡng môi mini cùng một chiếc kẹp tóc nhung siêu dễ thương viết tay lời xin lỗi của shop gửi riêng cho chị ạ. Phí ship shop lo hết từ A đến Z, mong chị cho shop cơ hội chuộc lỗi nha chị.'
  },
  {
    id: 'rec-6',
    campaignId: 'campaign-1',
    campaignName: 'Tập dữ liệu Khiếu nại Quà tặng Livestream',
    contributorName: 'Bao Quoc',
    recordedTime: 'Yesterday, 15:02',
    duration: '1m 02s',
    status: 'Pending review',
    rewardAmount: 8000,
    quality: 'Good',
    contextSnapshot: 'Khách mua sữa rửa mặt bị thiếu quà mặt nạ giấy trà xanh.',
    audioDurationSec: 62,
    customerContext: 'Khách hàng mua tuýp sữa rửa mặt tạo bọt trị mụn, quà tặng kèm là 3 miếng mặt nạ bã trà xanh làm dịu da. Hàng giao thiếu mặt nạ làm khách cảm thấy không được tôn trọng.',
    agentContext: 'Nhân viên xin lỗi chân thành, thú nhận lỗi đồng bộ tồn kho thực tế và gửi bù 5 miếng mặt nạ thay vì 3 miếng để bày tỏ thành ý đền bù thiệt hại lòng tin.',
    useCaseDomain: 'Quản trị lòng tin khách hàng và chăm sóc hậu mãi ngành Mỹ phẩm Thẩm mỹ.',
    transcript: '[AI - Khách hàng]: Cho mình hỏi tí, mình mua chai sữa rửa mặt trị mụn, trên livestream bạn mẫu bảo được tặng 3 miếng mặt nạ trà xanh kèm theo cơ mà? Sao mở ra trống trơn vậy shop?\n[Contributor - CSKH]: Dạ em chào anh Quốc ạ. Dạ em vô cùng xin lỗi anh vì sơ suất thiếu sót mặt nạ tặng kèm trong đơn của mình ạ.\n[AI - Khách hàng]: Mình mua để trải nghiệm trọn bộ skincare cho da dầu mụn mà thiếu thế này thì hiệu quả sao tốt được. Thấy hơi thất vọng về cách làm việc của shop.\n[Contributor - CSKH]: Dạ em rất thấu hiểu nỗi lòng của anh ạ. Sự cố này xảy ra do lượng tồn kho của mặt nạ trà xanh bị lệch pha so với lượng đơn thực tế lúc live. Để khắc phục và mong anh tiếp tục đồng hành, em xin gửi bù hỏa tức cho anh 5 miếng mặt nạ trà xanh (vượt thêm 2 miếng so với quà ban đầu) hoàn toàn miễn phí ạ. Đơn gửi bù sẽ được giao đến anh sau 1 tới 2 ngày nữa ạ.'
  },
  {
    id: 'rec-7',
    campaignId: 'campaign-1',
    campaignName: 'Tập dữ liệu Khiếu nại Quà tặng Livestream',
    contributorName: 'Yen Vy',
    recordedTime: 'Yesterday, 12:45',
    duration: '1m 15s',
    status: 'Pending review',
    rewardAmount: 8000,
    quality: 'Good',
    contextSnapshot: 'Set sữa tắm nước hoa thiếu quà túi lưới tạo bọt.',
    audioDurationSec: 75,
    customerContext: 'Khách mua sữa tắm lưu hương dài lâu kèm quà tặng túi lưới tạo bọt massage. Khi khui kiện hàng không thấy túi lưới đâu, khách gọi tổng đài phàn nàn.',
    agentContext: 'Nhân viên hỗ trợ nhã nhặn, cam kết chuyển phát nhanh túi lưới và tặng thêm một bánh xà phòng thảo dược mini trị giá 30.000đ.',
    useCaseDomain: 'Chăm sóc cá nhân - Hỗ trợ phụ kiện tắm đi kèm đơn hàng.',
    transcript: '[AI - Khách hàng]: Em ơi, chị mua hộp sữa tắm nước hoa hắc hải hương mà tìm không thấy cái túi lưới kèm bông tạo bọt đâu cả? Chị mua chai sữa tắm này chủ yếu vì muốn xài chung với túi lưới chuyên dụng tạo bọt của shop mà giờ giao thiếu rồi làm sao đây?\n[Contributor - CSKH]: Dạ, em xin chào chị Vy ạ. Shop rất lấy làm tiếc vì nhân viên kiểm hàng đã bất cẩn sót mất túi lưới massage tạo bọt của chị ạ. Em xin lỗi chị nhiều lắm.\n[AI - Khách hàng]: Chán quá em ơi, ship thì lâu mà tới nơi đồ dùng thiết yếu lại thiếu thốn như vầy.\n[Contributor - CSKH]: Dạ chị Vy đừng buồn ạ, lỗi của bên em em xin gánh hoàn toàn. Em xin phép làm một phiếu biên nhận gửi hỏa tốc túi lưới tạo bọt xịn sò mới kèm theo một bánh xà phòng thảo mộc dưỡng ẩm mini tặng riêng cho mình nha chị. Toàn bộ phí ship gửi bù bên em chịu 100% ạ, tầm mai hoặc mốt là chị nhận được để xài chung với sữa tắm rồi ạ.'
  },
  {
    id: 'rec-acc-1',
    campaignId: 'campaign-1',
    campaignName: 'Tập dữ liệu Khiếu nại Quà tặng Livestream',
    contributorName: 'Minh Pham',
    recordedTime: '2 days ago',
    duration: '1m 18s',
    status: 'Accepted',
    rewardAmount: 8000,
    quality: 'Excellent',
    contextSnapshot: 'Thiếu quà tặng nước hoa hồng mini từ livestream mỹ phẩm dưỡng da.',
    audioDurationSec: 78,
    customerContext: 'Khách hàng đặt bộ mỹ phẩm dưỡng da trị giá 1.500.000đ từ livestream tối thứ 6, shop hứa tặng kèm 1 chai nước hoa hồng mini 30ml nhưng khi nhận hàng chỉ có bộ mỹ phẩm, thiếu quà tặng. Người dùng bực tức, nghi ngờ shop khuyến mãi ảo.',
    agentContext: 'Nhân viên chăm sóc khách hàng tư vấn nhẹ nhàng, tiếp nhận thông tin khiếu nại, chủ động tra cứu lịch sử livestream và đề xuất giải pháp gửi bù quà tặng kèm lời xin lỗi chuẩn chỉ trong vòng 2 ngày làm việc.',
    useCaseDomain: 'Xử lý khiếu nại đơn hàng mỹ phẩm thiếu quà khi mua sắm qua Livestream Social Commerce.',
    transcript: '[AI - Khách hàng]: Alo! Cho tôi hỏi đây có phải là shop mỹ phẩm hôm trước livestream không ạ? Tôi vừa nhận hàng xong nhưng tại sao trong hộp không có chai nước hoa hồng mini như bạn mẫu quảng cáo khi chốt đơn vậy?\n[Contributor - CSKH]: Dạ em chào chị ạ. Em rất xin lỗi vì trải nghiệm chưa trọn vẹn này. Chị cho em xin mã đơn hàng hoặc số điện thoại đặt hàng để em kiểm tra ngay giúp mình được không ạ?\n[AI - Khách hàng]: Mã đơn của tôi là MP-9921 nhé. Bạn giải quyết nhanh giúp, tôi bức xúc lắm, nếu không có quà khuyến mãi thì đừng có quảng cáo làm chi để lừa dối khách hàng như vậy!\n[Contributor - CSKH]: Dạ em đã tra cứu thấy đơn hàng MP-9921 của chị trên hệ thống rồi ạ. Đúng là đơn này của mình được áp dụng chương trình tặng nước hoa hồng mini 30ml thời điểm livestream. Do đội ngũ đóng gói của tụi em bị quá tải nên đã sơ suất bỏ sót quà tặng của chị. Chân thành xin lỗi chị rất nhiều ạ. Em sẽ lập tức tạo một vận đơn gửi bù hỏa tốc chai nước hoa hồng này hoàn toàn miễn phí đến chị ngay trong chiều nay, tầm 2 ngày là chị nhận được. Chị đồng ý giúp em phương án xử lý này nhé ạ?'
  },
  {
    id: 'rec-acc-2',
    campaignId: 'campaign-1',
    campaignName: 'Tập dữ liệu Khiếu nại Quà tặng Livestream',
    contributorName: 'Gia Long',
    recordedTime: '2 days ago',
    duration: '1m 02s',
    status: 'Accepted',
    rewardAmount: 8000,
    quality: 'Good',
    contextSnapshot: 'Thiếu cọ trang điểm đi kèm hộp son môi cao cấp.',
    audioDurationSec: 62,
    customerContext: 'Khách mua son môi cao cấp kèm quà tặng cọ trang điểm, khi nhận bị thiếu cọ, khách giận hỏi shop tại sao lừa dối.',
    agentContext: 'Nhân viên xoa dịu vị khách giận dữ, xác nhận sơ sót khâu kho bãi và tặng voucher giảm giá 10% kèm gửi bù.',
    useCaseDomain: 'Chăm sóc khách hàng và giải quyết lỗi đóng thiếu quà khuyến mãi ngành Mỹ phẩm Thẩm mỹ.',
    transcript: '[AI - Khách hàng]: Chào shop nhé, tôi nhận hộp son môi rồi nhưng lục tung cả hộp không thấy cây cọ bình luận tặng kèm đâu cả. Ủa làm ăn kiểu gì kỳ cục vậy, lừa khách à?\n[Contributor - CSKH]: Dạ, em xin chào chị ạ. Dạ trước hết shop vô cùng xin lỗi chị vì thiếu sót đáng tiếc này khiến chị phiền lòng. Dạ chị yên tâm, shop cam kết tặng quà đúng như livestream và sẽ chịu trách nhiệm hoàn toàn ạ. Chị vui lòng cho em xin số điện thoại đặt đơn để em kiểm tra đơn đóng gói nha chị.\n[AI - Khách hàng]: Số điện thoại tôi là 0905123456. Các bạn kiểm tra và giải quyết bù lại cho tôi đi, chứ mất công tôi mong đợi.\n[Contributor - CSKH]: Dạ em hệ thống thấy đơn hàng của chị rồi ạ. Dạ shop đã ghi nhận lỗi phân loại thiếu cọ trang điểm của mình. Em xin phép gửi bù cọ hỏa tốc trong hôm nay ạ, đồng thời shop gửi tặng chị một mã giảm giá 10% cho lần mua sau như một lời tạ lỗi chân thành. Mong chị thông cảm cho shop nhé ạ.'
  },
  {
    id: 'rec-ret-1',
    campaignId: 'campaign-1',
    campaignName: 'Tập dữ liệu Khiếu nại Quà tặng Livestream',
    contributorName: 'Khanh Vy',
    recordedTime: '3 days ago',
    duration: '30s',
    status: 'Retake requested',
    rewardAmount: 8000,
    quality: 'Low volume',
    contextSnapshot: 'Cuộc thoại quá ngắn so với kịch bản chuẩn mẫu.',
    audioDurationSec: 30,
    retakeReason: 'Hội thoại quá ngắn, chưa khai thác hết cốt truyện hỗ trợ khách hàng và thiếu lập trình đền bù quà tặng.',
    customerContext: 'Khách hàng mua kem dưỡng ẩm thiếu mẫu test thử kem body, báo lên shop nhưng contributor xử lý quá vội vã cúp máy sớm.',
    agentContext: 'CSKH dập máy quá nhanh khi chưa hoàn tất thu thập thông tin đơn hàng và giải pháp xoa dịu giải tỏa đe dọa.',
    useCaseDomain: 'Tối ưu hội thoại đàm thoại CSKH - Sửa đổi do lỗi tương tác cục bộ.',
    transcript: '[AI - Khách hàng]: Alo tôi mua kem dưỡng mà không có mẫu thử body vậy?\n[Contributor - CSKH]: À dạ em xin lỗi chị nha, để hệ thống kiểm tra lại. Cảm ơn chị.\n[AI - Khách hàng]: Ủa mà kiểm tra thế nào em ơi, dập máy luôn rồi hả?'
  }
];

export const mockCertificates: Certificate[] = [
  {
    id: 'cert-1',
    campaignId: 'campaign-1',
    type: 'Agreement',
    title: 'Xác nhận Điều khoản Chiến dịch của Người thuê',
    status: 'Confirmed',
    parties: ['Vy Tran (Buyer)', 'VoiceTurk Smart Escrow Module'],
    confirmedAt: '15/06/2026 15:12 UTC',
    termsSummary: 'Tuyên bố cam kết và đồng ý bộ hướng dẫn đánh giá hội thoại livestream chăm sóc khách hàng. Cam kết giải quyết payout cho contributor dựa trên chất lượng đầu ra.',
    proofRef: 'ipfs://QmYwAPJhc3A75A4wdGb7DRaFjC4wdGb7DRaFjC4wdGb7DR'
  },
  {
    id: 'cert-2',
    campaignId: 'campaign-1',
    type: 'Escrow',
    title: 'Ký quỹ Ngân sách Chiến dịch',
    status: 'Verified',
    parties: ['Vy Tran (Buyer)', 'VoiceTurk Escrow Account'],
    confirmedAt: '15/06/2026 15:15 UTC',
    termsSummary: 'Ký quỹ thành công 528.000 VND (bao gồm 480.000 VND quỹ payout contributor và 48,000 VND phí nền tảng) để kích hoạt chiến dịch.',
    proofRef: 'solana-tx://2AnYtX9Xp6Ym8ZLaK6uX3v4Kq8qF9zM2bK1Yg4Wp9tJs7'
  },
  {
    id: 'cert-3',
    campaignId: 'campaign-1',
    type: 'ContributorAgreement',
    title: 'Cam kết Tham gia của Cộng tác viên',
    status: 'Verified',
    parties: ['Minh Pham (Contributor)', 'VoiceTurk Trust Module'],
    confirmedAt: '18/06/2026 09:42 UTC',
    termsSummary: 'Chấp thuận ghi âm giọng nói, thực hiện hội thoại công bằng, đóng góp dữ liệu cho mục đích huấn luyện AI của khách hàng.',
    proofRef: 'ipfs://QmZpxG3Gny6FqXzS8y6E1VfWpLmD7XfJNsAdTpxG3Gny6'
  },
  {
    id: 'cert-4',
    campaignId: 'campaign-1',
    type: 'DatasetRelease',
    title: 'Mã Hash Phiên bản Tập dữ liệu: VT-LV-GIFT-1.0',
    status: 'Verified',
    parties: ['VoiceTurk System', 'IPFS Protocol'],
    confirmedAt: '20/06/2026 18:00 UTC',
    termsSummary: 'Hash bảo mật của phiên bản tập dữ liệu thô tự động tổng hợp từ 24 bản ghi hội thoại livestream đã được phê duyệt.',
    proofRef: 'ipfs://Qmd7X5z8mPFhW5DksFhUfJNsAdTpxG3Gny6FqXzS8yd7X'
  }
];

export const mockAgreements: ContributorAgreement[] = [
  {
    id: 'agree-1',
    campaignName: 'Tập dữ liệu Khiếu nại Quà tặng Livestream',
    consentStatus: 'Agreed',
    confirmedTime: '18/06/2026 09:42 UTC',
    rewardRule: '8.000 VND cho mỗi bản ghi được chấp nhận. Thanh toán hàng tuần sau khi nhà thuê phê duyệt.',
    consentDetails: 'Đồng ý cung cấp mẫu file ghi âm tự do vai hỗ trợ khách hàng cho chiến dịch "Khiếu nại quà tặng livestream". Cam kết không spam, không chửi bới, sử dụng từ ngữ lịch sự chuyên nghiệp.'
  }
];
