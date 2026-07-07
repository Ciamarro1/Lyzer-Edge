import { getAllLessons } from './lessonRegistry.js';

/**
 * Confidence Calibration Monitor
 * Evaluates the Epistemic Error across a batch of resolved trades.
 */
export function assessCalibration() {
    const lessons = getAllLessons();
    
    if (lessons.length === 0) {
        console.log(`[CALIBRATION] No resolved trades available for calibration.`);
        return null;
    }

    let totalConfidence = 0;
    let totalWins = 0;
    let totalConfidenceError = 0;

    lessons.forEach(l => {
        totalConfidence += l.confidence;
        // if error_type === 'NONE', it was a win
        if (l.error_type === 'NONE') totalWins++;
        totalConfidenceError += l.confidence_error;
    });

    const avgConfidence = totalConfidence / lessons.length;
    const winRate = totalWins / lessons.length;
    
    // Brier Score Approximation (Calibration Error)
    const calibrationError = Math.abs(avgConfidence - winRate);
    const avgEpistemicError = totalConfidenceError / lessons.length;

    const report = {
        total_trades_analyzed: lessons.length,
        avg_confidence: avgConfidence,
        actual_win_rate: winRate,
        calibration_error: calibrationError,
        avg_epistemic_error: avgEpistemicError,
        status: calibrationError > 0.25 ? 'EPISTEMIC_CRISIS' : 'CALIBRATED'
    };

    console.log(`\n===========================================`);
    console.log(`[CALIBRATION MONITOR] Batch Analysis Report`);
    console.log(`Trades Analyzed: ${report.total_trades_analyzed}`);
    console.log(`Avg Confidence : ${(report.avg_confidence * 100).toFixed(2)}%`);
    console.log(`Actual Win Rate: ${(report.actual_win_rate * 100).toFixed(2)}%`);
    console.log(`Calibration Err: ${(report.calibration_error * 100).toFixed(2)}%`);
    console.log(`Status         : ${report.status}`);
    console.log(`===========================================\n`);

    return report;
}
