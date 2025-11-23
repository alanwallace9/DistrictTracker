import { SignUp } from '@clerk/nextjs';
import { Shield } from 'lucide-react';

export default function SignUpPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: '#1a1f2e' }}>
      <div className="w-full max-w-md">
        {/* Logo and Title */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center" style={{ backgroundColor: '#0f1419' }}>
            <Shield className="w-8 h-8" style={{ color: '#22c45d' }} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">BISD Trespass Management</h1>
          <p className="text-sm text-slate-400">Create your account via invitation</p>
        </div>

        {/* Clerk Sign-Up Component with Custom Styling */}
        <SignUp
          appearance={{
            elements: {
              rootBox: "mx-auto",
              card: "bg-[#0f1419] border border-slate-700/50 shadow-2xl",
              headerTitle: "hidden",
              headerSubtitle: "hidden",
              socialButtonsBlockButton: "bg-slate-800 border-slate-600 hover:bg-slate-700 text-white",
              socialButtonsBlockButtonText: "text-white font-medium",
              formButtonPrimary: "bg-[#22c45d] hover:bg-[#1ea54d] text-white font-medium",
              formFieldInput: "bg-[#1a1f2e] border-slate-600 text-white placeholder:text-slate-500",
              formFieldLabel: "text-slate-300",
              footerActionLink: "text-[#22c45d] hover:text-[#1ea54d]",
              identityPreviewText: "text-white",
              identityPreviewEditButtonIcon: "text-slate-400",
              formHeaderTitle: "text-white",
              formHeaderSubtitle: "text-slate-400",
              dividerLine: "bg-slate-700",
              dividerText: "text-slate-500",
              formFieldInputShowPasswordButton: "text-slate-400 hover:text-white",
              formResendCodeLink: "text-[#22c45d] hover:text-[#1ea54d]",
              otpCodeFieldInput: "bg-[#1a1f2e] border-slate-600 text-white",
            },
          }}
          routing="path"
          path="/sign-up"
        />

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500">powered by DistrictTracker.com</p>
        </div>
      </div>
    </div>
  );
}
