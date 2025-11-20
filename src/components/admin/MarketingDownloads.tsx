import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Download, Copy, Check } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

interface MarketingDownloadsProps {
  socialPost: string;
  imageUrl: string;
  bannerCode: string;
}

export const MarketingDownloads = ({ socialPost, imageUrl, bannerCode }: MarketingDownloadsProps) => {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const downloadSocialPost = () => {
    const blob = new Blob([socialPost], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'social-post.txt';
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: "Social post downloaded" });
  };

  const copyBannerCode = () => {
    navigator.clipboard.writeText(bannerCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast({ title: "Banner code copied to clipboard" });
  };

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="font-semibold mb-4">Social Media Post</h3>
        <p className="text-sm text-muted-foreground mb-4 p-4 bg-muted rounded">{socialPost}</p>
        <Button onClick={downloadSocialPost} variant="outline" className="w-full">
          <Download className="h-4 w-4 mr-2" />
          Download Social Post
        </Button>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Marketing Image</h3>
        <img src={imageUrl} alt="Marketing" className="w-full rounded mb-4" />
        <Button variant="outline" className="w-full" onClick={() => window.open(imageUrl, '_blank')}>
          <Download className="h-4 w-4 mr-2" />
          Download Image
        </Button>
      </Card>

      <Card className="p-6">
        <h3 className="font-semibold mb-4">Website Banner Code</h3>
        <pre className="text-xs bg-muted p-4 rounded mb-4 overflow-x-auto">
          {bannerCode}
        </pre>
        <Button onClick={copyBannerCode} variant="outline" className="w-full">
          {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
          {copied ? "Copied!" : "Copy Banner Code"}
        </Button>
      </Card>
    </div>
  );
};
