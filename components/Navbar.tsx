import {Sparkles} from "lucide-react";
import Button from "./ui/Button";
import {Link, useOutletContext} from "react-router";
import {useEffect, useState} from "react";

const Navbar = () => {
    const { isSignedIn, userName, signIn, signOut, refreshAuth } = useOutletContext<AuthContext>()
    const [authMessage, setAuthMessage] = useState<string | null>(null);

    useEffect(() => {
        setAuthMessage(null);
    }, [isSignedIn]);

    const handleAuthClick = async () => {
        if(isSignedIn) {
            try {
                await signOut();
            } catch (e) {
                console.error(`Puter sign out failed: ${e}`);
            }

            return;
        }

        try {
            const ok = await signIn();
            if (!ok) {
                setAuthMessage("Login could not be completed right now.");
            } else {
                await refreshAuth();
                setAuthMessage(null);
            }
        } catch (e) {
            console.error(`Puter sign in failed: ${e}`);
            setAuthMessage("Login could not be completed right now.");
        }
    };

    return (
        <header className="navbar">
            <nav className="inner">
                <div className="left">
                    <div className="brand">
                        <div className="logo-mark" aria-hidden="true">
                            <span className="logo-s">S</span>
                            <Sparkles className="logo-spark" />
                        </div>

                        <span className="name">
                            spacely
                        </span>
                    </div>

                    <ul className="links">
                        <a href="#projects">Projects</a>
                        <Link to="/community">Community</Link>
                    </ul>
                </div>

                <div className="actions">
                    {isSignedIn ? (
                        <>
                            <span className="greeting">
                                {userName ? `Hi, ${userName}` : 'Signed in'}
                            </span>

                            <Button size="sm" onClick={handleAuthClick} className="btn">
                                Log Out
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button onClick={handleAuthClick} size="sm" variant="ghost">
                                Log In
                            </Button>

                            {authMessage ? (
                                <span className="auth-message">{authMessage}</span>
                            ) : null}

                            <a href="#upload" className="cta">Get Started</a>
                        </>
                    )}
                </div>
            </nav>
        </header>
    )
}

export default Navbar
