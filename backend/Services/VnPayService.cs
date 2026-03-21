using System.Security.Cryptography;
using System.Text;

public class VnPayService
{
    private readonly IConfiguration _config;

    public VnPayService(IConfiguration config)
    {
        _config = config;
    }

    public string CreatePaymentUrl(HttpContext context, VnPayRequest model)
    {
        var tmnCode = _config["VnPay:TmnCode"]!;
        var hashSecret = _config["VnPay:HashSecret"]!;
        var baseUrl = _config["VnPay:BaseUrl"]!;
        var returnUrl = _config["VnPay:ReturnUrl"]!;

        // TxnRef phải ngắn gọn, dùng timestamp millis
        var txnRef = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
        var timeNow = DateTime.Now.ToString("yyyyMMddHHmmss");
        var ipAddr = GetIpAddress(context);

        // SortedDictionary — VNPay yêu cầu sắp xếp alphabet
        var vnpParams = new SortedDictionary<string, string>
        {
            { "vnp_Amount",      ((long)(model.Amount * 100)).ToString() },
            { "vnp_Command",     "pay" },
            { "vnp_CreateDate",  timeNow },
            { "vnp_CurrCode",    "VND" },
            { "vnp_IpAddr",      ipAddr },
            { "vnp_Locale",      "vn" },
            { "vnp_OrderInfo",   Uri.EscapeDataString(model.OrderInfo) },
            { "vnp_OrderType",   "other" },
            { "vnp_ReturnUrl",   returnUrl },
            { "vnp_TmnCode",     tmnCode },
            { "vnp_TxnRef",      txnRef },
            { "vnp_Version",     "2.1.0" },
        };

        // ⚠️ QUAN TRỌNG: rawData để ký dùng key=value KHÔNG encode key
        // value dùng WebUtility.UrlEncode (dấu cách → +, không phải %20)
        var rawParts = vnpParams.Select(kv =>
            $"{kv.Key}={System.Net.WebUtility.UrlEncode(kv.Value)}");
        var rawData = string.Join("&", rawParts);

        var secureHash = HmacSHA512(hashSecret, rawData);

        // URL cuối dùng Uri.EscapeDataString cho value (dấu cách → %20)
        var urlParts = vnpParams.Select(kv =>
            $"{kv.Key}={Uri.EscapeDataString(kv.Value)}");
        var queryString = string.Join("&", urlParts);

        return $"{baseUrl}?{queryString}&vnp_SecureHash={secureHash}";
    }

    public bool ValidateSignature(IQueryCollection query, string hashSecret)
    {
        var vnpSecureHash = query["vnp_SecureHash"].ToString();
        if (string.IsNullOrEmpty(vnpSecureHash)) return false;

        var sortedParams = new SortedDictionary<string, string>(StringComparer.Ordinal);
        foreach (var (k, v) in query)
        {
            if (!string.IsNullOrEmpty(k)
                && k.StartsWith("vnp_")
                && k != "vnp_SecureHash"
                && k != "vnp_SecureHashType")
            {
                sortedParams[k] = v.ToString();
            }
        }

        // Dùng WebUtility.UrlEncode (giống VNPay SDK chuẩn)
        var rawData = string.Join("&", sortedParams.Select(kv =>
            $"{kv.Key}={System.Net.WebUtility.UrlEncode(kv.Value)}"));

        var checkHash = HmacSHA512(hashSecret, rawData);
        return checkHash.Equals(vnpSecureHash, StringComparison.OrdinalIgnoreCase);
    }

    private static string HmacSHA512(string key, string data)
    {
        var keyBytes = Encoding.UTF8.GetBytes(key);
        var dataBytes = Encoding.UTF8.GetBytes(data);
        using var hmac = new HMACSHA512(keyBytes);
        var hashBytes = hmac.ComputeHash(dataBytes);
        return BitConverter.ToString(hashBytes).Replace("-", "").ToLower();
    }

    private static string GetIpAddress(HttpContext context)
    {
        // Ưu tiên X-Forwarded-For nếu qua proxy/nginx
        var forwarded = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwarded))
            return forwarded.Split(',')[0].Trim();

        var ip = context.Connection.RemoteIpAddress?.ToString();
        if (string.IsNullOrEmpty(ip) || ip == "::1") return "127.0.0.1";
        return ip;
    }
}

public class VnPayRequest
{
    public double Amount { get; set; }
    public string OrderInfo { get; set; } = "Thanh toan dat san";
    public int? BookingId { get; set; }
}

public class VnPayResponse
{
    public string TransactionId { get; set; } = "";
    public string OrderInfo { get; set; } = "";
    public double Amount { get; set; }
    public bool Success { get; set; }
    public string ResponseCode { get; set; } = "";
    public int? BookingId { get; set; }
}