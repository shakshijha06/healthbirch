import React from 'react'; // Import React for component creation.
import { Link, useLocation, useNavigate } from 'react-router-dom'; // Import routing helpers for navigation and location checks.
import { LogOut } from 'lucide-react'; // Import logout icon for action button.
import { useAuth } from '../../context/AuthContext'; // Import auth context hook to access current user state.
import { Button } from './Button'; // Import shared button component to keep action styles consistent.
import { auth } from '../../services/firebase'; // Import Firebase auth instance used for sign-out.
import { signOut } from 'firebase/auth'; // Import Firebase signOut function for logout action.
import logo from '../../assets/healthbirch-logo.png'; // Import HEALTHBIRCH brand logo.

export const Navbar = () => { // Declare shared sticky navigation bar component.
  const { user } = useAuth(); // Get current authenticated user data from context.
  const navigate = useNavigate(); // Create navigation helper for programmatic route changes.
  const location = useLocation(); // Read current route to decide section-scroll behavior.

  const handleLogout = async () => { // Define logout handler that signs out then routes to login.
    try { // Start guarded async operation for logout.
      await signOut(auth); // Sign out current user from Firebase authentication.
      navigate('/login'); // Redirect user to login page after successful sign-out.
    } catch (error) { // Catch and handle potential sign-out failures.
      console.error('Logout failed:', error); // Log failure details to help debugging in development.
    } // End logout error handling block.
  }; // Close logout handler function.

  const getDashboardLink = () => { // Resolve dashboard destination based on authenticated role.
    if (!user) return '/'; // Route guests to home when dashboard link requested.
    if (user.role === 'admin') return '/admin/dashboard'; // Route admin users to admin dashboard.
    if (user.role === 'doctor') return '/doctor/dashboard'; // Route doctor users to doctor dashboard.
    return '/patient/dashboard'; // Route all other authenticated users to patient dashboard.
  }; // Close role-based link resolver.

  const scrollToSection = (sectionId) => { // Define helper to smooth-scroll to a landing section by id.
    const targetElement = document.getElementById(sectionId); // Look up the destination section element in the DOM.
    if (targetElement) targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' }); // Scroll smoothly when section exists.
  }; // Close section scroll helper.

  const handleSectionClick = (event, sectionId) => { // Define click handler that supports in-page and cross-page smooth scrolling.
    if (location.pathname === '/') { // Check if user is already on the landing route.
      event.preventDefault(); // Prevent default anchor jump behavior on same page.
      scrollToSection(sectionId); // Trigger smooth scrolling directly to the target section.
    } // End same-page branch handling.
  }; // Close section link handler.

  return ( // Return sticky top navigation markup.
    <nav className="sticky top-0 z-50 border-b border-primary-light/10 bg-primary-dark/95 backdrop-blur-md shadow-soft"> {/* Render white sticky navbar with brand-tinted bottom border. */}
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8"> {/* Create responsive navbar container with balanced spacing. */}
        <Link to={user ? getDashboardLink() : "/"} className="flex items-center gap-2.5"> {/* Render logo link; navigate to dashboard if logged in, else home. */}
          <img src={logo} alt="HEALTHBIRCH" className="h-8 w-auto object-contain" /> {/* Render HEALTHBIRCH logo image beside brand text. */}
          <span className="text-xl font-bold tracking-tight text-white">HEALTHBIRCH</span> {/* Render brand wordmark in primary navy. */}
        </Link> {/* Close logo link block. */}

        <div className="hidden items-center gap-8 md:flex"> {/* Render desktop nav links with requested labels and gray tone. */}
          {(!user || user.role === 'patient') && (
            <>
              <Link to="/" className="text-sm font-medium text-white/80 transition-colors hover:text-white">Home</Link>
              <a href="/#how-it-works" onClick={(event) => handleSectionClick(event, 'how-it-works')} className="text-sm font-medium text-white/80 transition-colors hover:text-white">How It Works</a>
              <a href="/#about" onClick={(event) => handleSectionClick(event, 'about')} className="text-sm font-medium text-white/80 transition-colors hover:text-white">About</a>
            </>
          )}
        </div> {/* Close desktop nav link group. */}

        <div className="flex items-center gap-3"> {/* Render right-side auth actions area. */}
          {user ? ( // Branch UI for authenticated users.
            <> {/* Start grouped authenticated actions. */}
              <Link to={getDashboardLink()} className="text-sm font-medium text-textSecondary transition-colors hover:text-primary">Dashboard</Link> {/* Render dashboard route link for signed-in users. */}
              <Button variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700" onClick={handleLogout}> {/* Render logout button with subtle danger styling. */}
                <LogOut className="h-4 w-4" /> {/* Render logout icon inside button. */}
                <span className="hidden sm:inline">Logout</span> {/* Render logout label on larger screens for clarity. */}
              </Button> {/* Close logout action button. */}
            </> // End authenticated action fragment.
          ) : ( // Branch UI for guests.
            <> {/* Start grouped guest actions. */}
              <Link to="/login"> {/* Wrap login action in link to login route. */}
                <Button variant="secondary" className="px-4 py-2 text-sm">Login</Button> {/* Render outlined login button per design requirement. */}
              </Link> {/* Close login route wrapper. */}
              <Link to="/register"> {/* Wrap get-started action in link to registration route. */}
                <Button className="px-4 py-2 text-sm">Get Started</Button> {/* Render filled get-started button per design requirement. */}
              </Link> {/* Close registration route wrapper. */}
            </> // End guest action fragment.
          )} {/* End auth conditional rendering block. */}
        </div> {/* Close right-side actions area. */}
      </div> {/* Close navbar inner container. */}
    </nav> // Close navbar element.
  ); // Close JSX return.
}; // Close Navbar component declaration.
