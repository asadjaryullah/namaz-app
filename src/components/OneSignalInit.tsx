'use client';

import { useEffect } from 'react';
import OneSignal from 'react-onesignal';

export default function OneSignalInit() {
  useEffect(() => {
    // Nur im Browser ausführen
    if (typeof window !== 'undefined') {
      const runOneSignal = async () => {
        try {
          await OneSignal.init({
            // 👇 WICHTIG: HIER DEINE ONESIGNAL APP ID WIEDER EINTRAGEN:
            appId: "595fdd83-68b2-498a-8ca6-66fd1ae7be8e", 
            
            allowLocalhostAsSecureOrigin: true, // Erlaubt Testen auf localhost
            
            // HIER WAR DER FEHLER: Wir müssen alle Eigenschaften definieren
            notifyButton: {
              enable: true,
              showCredit: false, // Versteckt "Powered by OneSignal"
              prenotify: true,   // Zeigt beim ersten Besuch einen kleinen Hinweis
              
              // Deutsche Texte für den Button
              text: {
                'tip.state.unsubscribed': 'Benachrichtigungen aktivieren',
                'tip.state.subscribed': 'Du bist abonniert',
                'tip.state.blocked': 'Benachrichtigungen sind blockiert',
                'message.prenotify': 'Klicke um Push-Nachrichten zu erhalten',
                'message.action.subscribed': 'Danke fürs Abonnieren!',
                'message.action.resubscribed': 'Du bist wieder angemeldet',
                'message.action.unsubscribed': 'Du erhältst keine Nachrichten mehr',
                'dialog.main.title': 'Ride 2 Salah Benachrichtigungen',
                'dialog.main.button.subscribe': 'Abonnieren',
                'dialog.main.button.unsubscribe': 'Abbestellen',
                'dialog.blocked.title': 'Blockierung aufheben',
                'dialog.blocked.message': 'Bitte erlaube Benachrichtigungen in den Browser-Einstellungen.'
              },

              // Farben anpassen (Grün passend zur App)
              colors: { 
                'circle.background': '#16a34a',
                'circle.foreground': 'white',
                'badge.background': '#16a34a',
                'badge.foreground': 'white',
                'badge.bordercolor': 'white',
                'pulse.color': '#16a34a',
                'dialog.button.background.hovering': '#15803d',
                'dialog.button.background.active': '#15803d',
                'dialog.button.background': '#16a34a',
                'dialog.button.foreground': 'white'
              }
            },
          });
        } catch (error) {
          console.error("OneSignal Init Fehler:", error);
        }
      };
      runOneSignal();
    }
  }, []);

  return null; 
}