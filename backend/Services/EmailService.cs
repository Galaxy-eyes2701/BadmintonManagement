using System.Net;
using System.Net.Mail;

namespace backend.Services
{
    public class EmailService
    {
        public async Task SendEmailAsync(string toEmail, string subject, string htmlMessage)
        {
            // THAY BẰNG EMAIL CỦA ANH (Email dùng để tạo App Password)
            string fromEmail = "anhdai317392@gmail.com";

            // Password anh vừa cấp (Đã xóa dấu cách)
            string appPassword = "mbwhxvfcshhirxhe";

            var smtpClient = new SmtpClient("smtp.gmail.com")
            {
                Port = 587,
                Credentials = new NetworkCredential(fromEmail, appPassword),
                EnableSsl = true,
            };

            var mailMessage = new MailMessage
            {
                From = new MailAddress(fromEmail, "Sân Cầu Lông FPT (Hệ Thống)"),
                Subject = subject,
                Body = htmlMessage,
                IsBodyHtml = true,
            };
            mailMessage.To.Add(toEmail);

            await smtpClient.SendMailAsync(mailMessage);
        }
    }
}