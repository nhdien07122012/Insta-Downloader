import math
import os
import json
from PIL import Image, ImageDraw

def bezier_point(p0, p1, p2, p3, t):
    return (
        (1-t)**3 * p0[0] + 3*(1-t)**2*t * p1[0] + 3*(1-t)*t**2 * p2[0] + t**3 * p3[0],
        (1-t)**3 * p0[1] + 3*(1-t)**2*t * p1[1] + 3*(1-t)*t**2 * p2[1] + t**3 * p3[1]
    )

def create_icon(bg_color, petal_colors, size=1024):
    scale = size / 512.0 * 2.0
    hires = Image.new('RGBA', (size * 2, size * 2), bg_color)
    
    # Base petal points
    base_pts = []
    for i in range(50):
        t = i / 49.0
        base_pts.append(bezier_point((0*scale, -190*scale), (28*scale, -190*scale), (42*scale, -125*scale), (0*scale, -65*scale), t))
    for i in range(50):
        t = i / 49.0
        base_pts.append(bezier_point((0*scale, -65*scale), (-42*scale, -125*scale), (-28*scale, -190*scale), (0*scale, -190*scale), t))
    
    cx, cy = size, size
    for angle_deg, color in petal_colors:
        rad = math.radians(angle_deg)
        cos_a = math.cos(rad)
        sin_a = math.sin(rad)
        
        rot_pts = []
        for x, y in base_pts:
            rx = x * cos_a - y * sin_a + cx
            ry = x * sin_a + y * cos_a + cy
            rot_pts.append((rx, ry))
            
        petal_img = Image.new('RGBA', (size * 2, size * 2), (0, 0, 0, 0))
        p_draw = ImageDraw.Draw(petal_img)
        p_draw.polygon(rot_pts, fill=color)
        hires = Image.alpha_composite(hires, petal_img)
        
    return hires.resize((size, size), Image.Resampling.LANCZOS)

# 1. Colors Light (Mặc định)
colors_light = [
    (0, (255, 45, 85, 235)),
    (45, (255, 149, 0, 235)),
    (90, (255, 204, 0, 235)),
    (135, (76, 217, 100, 235)),
    (180, (90, 200, 250, 235)),
    (225, (0, 122, 255, 235)),
    (270, (88, 86, 214, 235)),
    (315, (175, 82, 222, 235)),
]

# 2. Colors Dark (Tối)
colors_dark = [
    (0, (255, 60, 95, 245)),
    (45, (255, 160, 20, 245)),
    (90, (255, 215, 20, 245)),
    (135, (85, 230, 110, 245)),
    (180, (100, 210, 255, 245)),
    (225, (20, 140, 255, 245)),
    (270, (110, 105, 235, 245)),
    (315, (190, 100, 240, 245)),
]

# 3. Colors Tinted (Trong suốt / Phủ màu)
colors_tinted = [
    (0, (255, 255, 255, 235)),
    (45, (240, 240, 240, 235)),
    (90, (255, 255, 255, 235)),
    (135, (240, 240, 240, 235)),
    (180, (255, 255, 255, 235)),
    (225, (240, 240, 240, 235)),
    (270, (255, 255, 255, 235)),
    (315, (240, 240, 240, 235)),
]

icon_dir = os.path.abspath("ios-photo-app/ios/App/App/Assets.xcassets/AppIcon.appiconset")
app_dir = os.path.abspath("ios-photo-app/ios/App/App")
os.makedirs(icon_dir, exist_ok=True)

# Generate 1024x1024 masters
icon_light = create_icon((255, 255, 255, 255), colors_light, 1024)
icon_dark = create_icon((0, 0, 0, 255), colors_dark, 1024)
icon_tinted = create_icon((0, 0, 0, 255), colors_tinted, 1024)

# Convert to RGB (opaque) for Light and Tinted as per Apple guidelines
icon_light_rgb = icon_light.convert('RGB')
icon_dark_rgb = icon_dark.convert('RGB')
icon_tinted_rgb = icon_tinted.convert('RGB')

# Save 3 iOS 18 Universal Icons
icon_light_rgb.save(os.path.join(icon_dir, "AppIcon-512@2x.png"), "PNG")
icon_dark_rgb.save(os.path.join(icon_dir, "AppIcon-Dark.png"), "PNG")
icon_tinted_rgb.save(os.path.join(icon_dir, "AppIcon-Tinted.png"), "PNG")

# Also save to app_dir
icon_light_rgb.save(os.path.join(app_dir, "iTunesArtwork@2x.png"), "PNG")
icon_dark_rgb.save(os.path.join(app_dir, "AppIcon-Dark.png"), "PNG")
icon_tinted_rgb.save(os.path.join(app_dir, "AppIcon-Tinted.png"), "PNG")

# Scaled icons for older iOS / standard icon slots
sizes = {
    "AppIcon-20@2x.png": 40,
    "AppIcon-20@3x.png": 60,
    "AppIcon-29@2x.png": 58,
    "AppIcon-29@3x.png": 87,
    "AppIcon-40@2x.png": 80,
    "AppIcon-40@3x.png": 120,
    "AppIcon-60@2x.png": 120,
    "AppIcon-60@3x.png": 180,
    "AppIcon-76@2x.png": 152,
    "AppIcon-83.5@2x.png": 167,
}

for name, s in sizes.items():
    resized = icon_light_rgb.resize((s, s), Image.Resampling.LANCZOS)
    resized.save(os.path.join(icon_dir, name), "PNG")

# Copy 60x60@2x / @3x to app_dir
icon_light_rgb.resize((120, 120), Image.Resampling.LANCZOS).save(os.path.join(app_dir, "AppIcon60x60@2x.png"), "PNG")
icon_light_rgb.resize((180, 180), Image.Resampling.LANCZOS).save(os.path.join(app_dir, "AppIcon60x60@3x.png"), "PNG")

# Write Contents.json with Light, Dark, Tinted configuration
contents = {
  "images": [
    {
      "idiom": "iphone",
      "size": "20x20",
      "scale": "2x",
      "filename": "AppIcon-20@2x.png"
    },
    {
      "idiom": "iphone",
      "size": "20x20",
      "scale": "3x",
      "filename": "AppIcon-20@3x.png"
    },
    {
      "idiom": "iphone",
      "size": "29x29",
      "scale": "2x",
      "filename": "AppIcon-29@2x.png"
    },
    {
      "idiom": "iphone",
      "size": "29x29",
      "scale": "3x",
      "filename": "AppIcon-29@3x.png"
    },
    {
      "idiom": "iphone",
      "size": "40x40",
      "scale": "2x",
      "filename": "AppIcon-40@2x.png"
    },
    {
      "idiom": "iphone",
      "size": "40x40",
      "scale": "3x",
      "filename": "AppIcon-40@3x.png"
    },
    {
      "idiom": "iphone",
      "size": "60x60",
      "scale": "2x",
      "filename": "AppIcon-60@2x.png"
    },
    {
      "idiom": "iphone",
      "size": "60x60",
      "scale": "3x",
      "filename": "AppIcon-60@3x.png"
    },
    {
      "idiom": "ipad",
      "size": "76x76",
      "scale": "2x",
      "filename": "AppIcon-76@2x.png"
    },
    {
      "idiom": "ipad",
      "size": "83.5x83.5",
      "scale": "2x",
      "filename": "AppIcon-83.5@2x.png"
    },
    {
      "idiom": "universal",
      "platform": "ios",
      "size": "1024x1024",
      "filename": "AppIcon-512@2x.png"
    },
    {
      "appearances": [
        {
          "appearance": "luminosity",
          "value": "dark"
        }
      ],
      "idiom": "universal",
      "platform": "ios",
      "size": "1024x1024",
      "filename": "AppIcon-Dark.png"
    },
    {
      "appearances": [
        {
          "appearance": "luminosity",
          "value": "tinted"
        }
      ],
      "idiom": "universal",
      "platform": "ios",
      "size": "1024x1024",
      "filename": "AppIcon-Tinted.png"
    }
  ],
  "info": {
    "author": "xcode",
    "version": 1
  }
}

with open(os.path.join(icon_dir, "Contents.json"), "w", encoding="utf-8") as f:
    json.dump(contents, f, indent=2)

print("iOS 18 Light, Dark, Tinted icons generated successfully!")
