# PowerAlert Frontend

## Modern Utility Outage Management System

PowerAlert is a comprehensive utility notification service designed to help Sri Lankans manage frequent power outages and water supply disruptions through timely alerts and useful information.

![Logo1-removebg-preview](https://github.com/user-attachments/assets/5b45f5f6-d6e2-495b-b854-b6c19f238bd5)


## 📱 Frontend Overview

The PowerAlert frontend provides an intuitive, responsive interface built with modern web technologies:

- **HTML5** - Semantic markup for accessibility and SEO
- **CSS3** - Advanced styling with flexbox and grid layouts
- **JavaScript** - Interactive features and asynchronous API communication
- **Tailwind CSS** - Utility-first CSS framework for rapid UI development

## ✨ Key Frontend Features

- **Responsive Design**: Optimized for all devices from mobile to desktop
- **Real-time Notifications**: Instant alerts for utility outages
- **Geospatial Integration**: Location-based service information
- **Interactive Dashboards**: Visualize outage patterns and predictions
- **Multilingual Support**: Sinhala, Tamil, and English interfaces
- **Accessibility**: WCAG-compliant design elements
- **Dark/Light Mode**: Comfortable viewing in any environment

## 🏗️ Project Structure

```
poweralert-frontend/
├── assets/             # Static assets (images, icons)
├── css/                # Global styles and Tailwind config
├── js/                 # JavaScript modules and utilities
│   ├── api/            # API integration services
│   ├── components/     # Reusable UI components
│   └── utils/          # Helper functions
├── pages/              # Main application pages
│   ├── dashboard/      # User dashboard views
│   ├── admin/          # Admin interface
│   └── auth/           # Authentication pages
├── templates/          # HTML templates
└── index.html          # Entry point
```

## 🎨 Design System

PowerAlert uses a consistent design system built on Tailwind CSS:

- **Color Palette**: Blue-focused palette with accessibility-verified contrast
- **Typography**: Inter font family for excellent readability
- **Components**: Reusable UI elements (buttons, cards, forms)
- **Spacing**: Consistent spacing scale throughout the application

## 🔒 Authentication

The frontend implements several secure authentication methods:

- JWT-based authentication
- Password reset with email verification
- Two-factor authentication (SMS/email)
- Remember me functionality
- Session management

## 🌐 API Integration

The frontend communicates with the PowerAlert backend through RESTful APIs:

- User authentication and profile management
- Outage reporting and notifications
- Geospatial data for mapping
- Utility provider information
- Historical data and analytics

## 🌐 Internationalization

PowerAlert supports multiple languages to serve all Sri Lankan communities:

- English
- Sinhala
- Tamil

Language preferences are stored in local storage and can be changed in the user settings.

## 📱 Progressive Web App (PWA)

PowerAlert is designed as a Progressive Web App, offering:

- Offline capability for critical information
- Add to home screen functionality
- Push notifications (where supported)
- Fast loading times with service workers

## 🧪 Testing

Run the test suite to ensure everything is working correctly:

```bash
npm run test
```

## 🤝 Contributing

We welcome contributions to improve PowerAlert:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📜 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Contact

For any questions or feedback, please contact our team at alerts.poweralert@gmail.com

---

PowerAlert: Empowering Sri Lankans to effectively plan around utility disruptions.
