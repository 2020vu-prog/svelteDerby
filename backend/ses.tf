resource "aws_ses_domain_identity" "rr1" {
  domain = var.DnsDomain
}
resource "aws_ses_domain_mail_from" "rr1" {
  domain           = aws_ses_domain_identity.rr1.domain
  mail_from_domain = "mail.${var.DnsDomain}"
}

resource "aws_route53_record" "rr1_amazonses_verification_record" {
  zone_id = data.aws_route53_zone.derby_zone[0].zone_id
  name    = "_amazonses.${aws_ses_domain_identity.rr1.id}"
  type    = "TXT"
  ttl     = "600"
  records = [aws_ses_domain_identity.rr1.verification_token]
}

resource "aws_ses_domain_identity_verification" "rr1_verification" {
  domain = aws_ses_domain_identity.rr1.id

  depends_on = [aws_route53_record.rr1_amazonses_verification_record]
}





resource "aws_ses_domain_dkim" "ses_domain_dkim" {
  domain = join("", aws_ses_domain_identity.rr1.*.domain)
}

resource "aws_route53_record" "amazonses_dkim_record" {
  count   = 3
  zone_id = data.aws_route53_zone.derby_zone[0].zone_id
  name    = "${element(aws_ses_domain_dkim.ses_domain_dkim.dkim_tokens, count.index)}._domainkey.${var.DnsDomain}"
  type    = "CNAME"
  ttl     = "600"
  records = ["${element(aws_ses_domain_dkim.ses_domain_dkim.dkim_tokens, count.index)}.dkim.amazonses.com"]
}

resource "aws_route53_record" "spf_mail_from" {
  zone_id = data.aws_route53_zone.derby_zone[0].zone_id
  name    = aws_ses_domain_mail_from.rr1.mail_from_domain
  type    = "TXT"
  ttl     = "600"
  records = ["v=spf1 include:amazonses.com -all"]
}

resource "aws_route53_record" "spf_domain" {
  zone_id = data.aws_route53_zone.derby_zone[0].zone_id
  name    = var.DnsDomain
  type    = "TXT"
  ttl     = "600"
  records = ["v=spf1 include:amazonses.com -all"]
}
