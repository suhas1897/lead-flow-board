import { Facebook, Twitter, Instagram, Youtube, Linkedin, MessageCircle } from 'lucide-react';

interface SocialLinksProps {
  notes: string | null;
  phone: string | null;
}

interface SocialLink {
  platform: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}

const SocialLinks = ({ notes, phone }: SocialLinksProps) => {
  const parseSocialLinks = (): SocialLink[] => {
    const links: SocialLink[] = [];

    // Try to parse social links from notes
    if (notes) {
      try {
        const parsed = JSON.parse(notes);
        
        if (parsed.facebook) {
          links.push({
            platform: 'Facebook',
            url: parsed.facebook,
            icon: Facebook,
            color: 'hover:text-[#1877F2]',
          });
        }
        
        if (parsed.twitter) {
          links.push({
            platform: 'Twitter',
            url: parsed.twitter,
            icon: Twitter,
            color: 'hover:text-[#1DA1F2]',
          });
        }
        
        if (parsed.instagram) {
          links.push({
            platform: 'Instagram',
            url: parsed.instagram,
            icon: Instagram,
            color: 'hover:text-[#E4405F]',
          });
        }
        
        if (parsed.youtube) {
          links.push({
            platform: 'YouTube',
            url: parsed.youtube,
            icon: Youtube,
            color: 'hover:text-[#FF0000]',
          });
        }
        
        if (parsed.linkedin) {
          links.push({
            platform: 'LinkedIn',
            url: parsed.linkedin,
            icon: Linkedin,
            color: 'hover:text-[#0A66C2]',
          });
        }
      } catch (e) {
        // If notes is not valid JSON, ignore silently
      }
    }

    // Add WhatsApp link if phone number exists
    if (phone) {
      // Clean phone number (remove spaces, dashes, parentheses)
      const cleanPhone = phone.replace(/[\s\-\(\)]/g, '');
      links.push({
        platform: 'WhatsApp',
        url: `https://wa.me/${cleanPhone}`,
        icon: MessageCircle,
        color: 'hover:text-[#25D366]',
      });
    }

    return links;
  };

  const socialLinks = parseSocialLinks();

  // Don't render anything if there are no social links
  if (socialLinks.length === 0) {
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-foreground">Social Links</div>
      <div className="flex flex-wrap gap-2">
        {socialLinks.map((link) => {
          const Icon = link.icon;
          return (
            <a
              key={link.platform}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className={`flex items-center gap-1.5 px-3 py-2 rounded-md bg-muted text-muted-foreground transition-all duration-200 ${link.color} hover:bg-muted/80 group`}
              title={link.platform}
            >
              <Icon className="w-4 h-4 transition-transform group-hover:scale-110" />
              <span className="text-xs font-medium">{link.platform}</span>
            </a>
          );
        })}
      </div>
    </div>
  );
};

export default SocialLinks;
