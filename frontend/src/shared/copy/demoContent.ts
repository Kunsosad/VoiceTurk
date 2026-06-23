// Central repository of natural Vietnamese demo contents for VoiceTurk scenarios

export const DEMO_CAMPAIGN = {
  name: "Livestream Gift Complaint Dataset",
  vietnameseDisplayName: "Bộ dữ liệu Khiếu nại Quà tặng Livestream",
  context: "Khách mua mỹ phẩm qua livestream vì được hứa có quà tặng mini, nhưng khi nhận hàng lại không có. Khách bực và nghi shop lừa.",
  aiCustomerRole: "Khách hàng bực, nghi ngờ và muốn shop xử lý ngay.",
  contributorRole: "Nhân viên chăm sóc khách hàng của shop.",
  conversationLimit: "Max 5 turns per side",
  targetAcceptedRecordings: 60,
  pricePerRecording: 8000, // VND
  
  // Sample dialogues for AI Customer and Contributor interaction
  sampleAiLines: [
    "Tôi mua trong live vì thấy nói có quà tặng mini, giờ nhận hàng lại không có.",
    "Shop làm ăn lừa đảo à? Tôi cần giải quyết ngay hôm nay!",
    "Nếu không có quà thì phải hoàn hồi tiền bớt chứ sao treo đầu dê bán thịt chó thế?",
    "Hồi livestream rõ ràng nói bất kỳ đơn nào hôm nay cũng có quà mà."
  ],
  sampleContributorGuide: "Lắng nghe, xoa dịu khách hàng, giải thích quy trình kiểm tra mã đơn hoặc tặng mã giảm giá đền bù.",
  
  // Suggested Vietnamese prompt/scenario builder instructions
  suggestedInstructions: "Hãy nhập kịch bản chăm sóc khách hàng về khiếu nại giao thiếu quà tặng livestream của shop mỹ phẩm."
};
