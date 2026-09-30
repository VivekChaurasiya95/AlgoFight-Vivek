import { useState, useEffect, useCallback, useRef } from 'react';
import { useNotification } from '../contexts/NotificationContext';
import { getSocket } from '../services/socket';

export function useAntiCheat(isActive = true, options = {}) {
    const { roomId, onTabSwitch, onDisqualified } = options;
    const { notify } = useNotification();

    const [isBlurred, setIsBlurred] = useState(false);
    const [violations, setViolations] = useState(0);
    const [tabSwitches, setTabSwitches] = useState(0);
    const [isDisqualified, setIsDisqualified] = useState(false);
    
    const violationsRef = useRef(0);
    const tabSwitchesRef = useRef(0);
    const hasLeftRef = useRef(false);
    const lastWarnedTimeRef = useRef(0);

    const resetViolations = useCallback(() => {
        violationsRef.current = 0;
        setViolations(0);
        setIsDisqualified(false);
    }, []);

    const onUserLeft = useCallback(() => {
        if (!isActive) return;
        setIsBlurred(true);
        hasLeftRef.current = true;
    }, [isActive]);

    const onUserReturned = useCallback(() => {
        if (!isActive) return;
        setIsBlurred(false);

        const now = Date.now();
        // Prevent duplicate events within 1.5 seconds
        if (hasLeftRef.current && (now - lastWarnedTimeRef.current > 1500)) {
            hasLeftRef.current = false;
            lastWarnedTimeRef.current = now;

            // Increment total tab switches (never capped, preserved for final results)
            tabSwitchesRef.current += 1;
            const currentTotalSwitches = tabSwitchesRef.current;
            setTabSwitches(currentTotalSwitches);

            // Increment warning counter
            violationsRef.current += 1;
            const newCount = violationsRef.current;
            setViolations(newCount);

            // Report violation to socket server
            const socket = getSocket();
            if (socket && roomId) {
                socket.emit("anti_cheat_violation", {
                    roomId,
                    type: "tab_switch",
                    tabSwitches: currentTotalSwitches,
                });
            }

            if (onTabSwitch) {
                onTabSwitch(currentTotalSwitches);
            }

            if (newCount < 3) {
                notify({
                    type: 'warning',
                    title: `ANTI-CHEAT WARNING (${newCount}/3)`,
                    message: `Screen leave detected! Total tab switches: ${currentTotalSwitches}. 3 violations will result in disqualification.`,
                    duration: 6000,
                });
            } else {
                setIsDisqualified(true);
                notify({
                    type: 'error',
                    title: 'ANTI-CHEAT DISQUALIFICATION',
                    message: `You exceeded allowable screen leaves (${currentTotalSwitches} tab switches). You are disqualified and must request host approval to re-enter.`,
                    duration: 8000,
                });
                if (onDisqualified) {
                    onDisqualified(currentTotalSwitches);
                }
            }
        }
    }, [isActive, notify, roomId, onTabSwitch, onDisqualified]);

    const handleVisibilityChange = useCallback(() => {
        if (document.hidden) {
            onUserLeft();
        } else {
            onUserReturned();
        }
    }, [onUserLeft, onUserReturned]);

    const handleBlur = useCallback(() => {
        onUserLeft();
    }, [onUserLeft]);

    const handleFocus = useCallback(() => {
        onUserReturned();
    }, [onUserReturned]);

    const handleKeyDown = useCallback((e) => {
        if (!isActive) return;
        
        // Prevent PrintScreen or common screenshot shortcuts
        if (e.key === 'PrintScreen' || (e.ctrlKey && e.shiftKey && (e.key === 'S' || e.key === 's'))) {
            e.preventDefault();
            try {
                navigator.clipboard.writeText('');
            } catch {}

            const now = Date.now();
            if (now - lastWarnedTimeRef.current > 1500) {
                lastWarnedTimeRef.current = now;

                tabSwitchesRef.current += 1;
                const currentTotalSwitches = tabSwitchesRef.current;
                setTabSwitches(currentTotalSwitches);

                violationsRef.current += 1;
                const newCount = violationsRef.current;
                setViolations(newCount);

                const socket = getSocket();
                if (socket && roomId) {
                    socket.emit("anti_cheat_violation", {
                        roomId,
                        type: "screenshot_attempt",
                        tabSwitches: currentTotalSwitches,
                    });
                }

                if (onTabSwitch) {
                    onTabSwitch(currentTotalSwitches);
                }

                if (newCount < 3) {
                    notify({
                        type: 'error',
                        title: `ANTI-CHEAT WARNING (${newCount}/3)`,
                        message: 'Screenshots are disabled during active combat sessions.',
                        duration: 6000,
                    });
                } else {
                    setIsDisqualified(true);
                    notify({
                        type: 'error',
                        title: 'ANTI-CHEAT DISQUALIFICATION',
                        message: 'Disqualified for repeated prohibited screenshot violations.',
                        duration: 8000,
                    });
                    if (onDisqualified) {
                        onDisqualified(currentTotalSwitches);
                    }
                }
            }
        }
    }, [isActive, notify, roomId, onTabSwitch, onDisqualified]);

    const handleCopy = useCallback((e) => {
        if (!isActive) return;
        e.preventDefault();
        const now = Date.now();
        if (now - lastWarnedTimeRef.current > 2000) {
            lastWarnedTimeRef.current = now;
            notify({
                type: 'warning',
                title: 'ANTI-CHEAT',
                message: 'Copying code is disabled in combat arena.',
                duration: 3000,
            });
        }
    }, [isActive, notify]);

    useEffect(() => {
        if (!isActive) return;

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        window.addEventListener('focus', handleFocus);
        document.addEventListener('keydown', handleKeyDown);
        document.addEventListener('copy', handleCopy);

        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
            window.removeEventListener('focus', handleFocus);
            document.removeEventListener('keydown', handleKeyDown);
            document.removeEventListener('copy', handleCopy);
        };
    }, [isActive, handleVisibilityChange, handleBlur, handleFocus, handleKeyDown, handleCopy]);

    return {
        isBlurred,
        violations,
        tabSwitches,
        isDisqualified,
        setIsDisqualified,
        resetViolations,
    };
}
