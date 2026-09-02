const express = require("express");
const router = express.Router();
const pool = require("../db");

const LIVE_INTERVAL_SECONDS = 300;

function buildLiveReport(rows, sessionId = null) {
    const stages = rows
        .map(row => Number(row.sleep_stage))
        .filter(stage => stage >= 0 && stage <= 3);

    const total = stages.length;
    const wakeCount = stages.filter(stage => stage === 0).length;
    const lightCount = stages.filter(stage => stage === 1).length;
    const deepCount = stages.filter(stage => stage === 2).length;
    const remCount = stages.filter(stage => stage === 3).length;
    const sleepCount = lightCount + deepCount + remCount;

    const timeInWake = wakeCount * LIVE_INTERVAL_SECONDS;
    const timeInLight = lightCount * LIVE_INTERVAL_SECONDS;
    const timeInDeep = deepCount * LIVE_INTERVAL_SECONDS;
    const timeInRem = remCount * LIVE_INTERVAL_SECONDS;
    const timeInSleep = sleepCount * LIVE_INTERVAL_SECONDS;
    const timeInBed = total * LIVE_INTERVAL_SECONDS;

    const firstSleepIndex = stages.findIndex(stage => stage !== 0);

    const sleepLatency =
        firstSleepIndex >= 0
            ? firstSleepIndex * LIVE_INTERVAL_SECONDS
            : null;

    const timeInSleepPeriod =
        firstSleepIndex >= 0
            ? (total - firstSleepIndex) * LIVE_INTERVAL_SECONDS
            : 0;

    const sleepEfficiency =
        timeInBed > 0
            ? timeInSleep / timeInBed
            : null;

    const wakeRatio =
        timeInBed > 0
            ? timeInWake / timeInBed
            : null;

    const sleepRatio =
        timeInBed > 0
            ? timeInSleep / timeInBed
            : null;

    const remRatio =
        timeInSleep > 0
            ? timeInRem / timeInSleep
            : null;

    const lightRatio =
        timeInSleep > 0
            ? timeInLight / timeInSleep
            : null;

    const deepRatio =
        timeInSleep > 0
            ? timeInDeep / timeInSleep
            : null;

    const firstSleepRow =
        firstSleepIndex >= 0
            ? rows[firstSleepIndex]
            : null;

    return {
        asleepUserId: rows[0]?.asleep_user_id ?? null,
        sessionId,
        sleepStages: stages,

        sleepEfficiency,
        sleepLatency,
        wakeupLatency: null,

        sleepTime: firstSleepRow?.created_at ?? null,
        wakeTime: null,

        timeInWake,
        timeInSleep,
        timeInBed,
        timeInSleepPeriod,
        timeInRem,
        timeInLight,
        timeInDeep,

        wakeRatio,
        sleepRatio,
        remRatio,
        lightRatio,
        deepRatio,

        latestStage: stages.length > 0
            ? stages[stages.length - 1]
            : null,

        sampleCount: total,
        intervalSeconds: LIVE_INTERVAL_SECONDS,
        updatedAt: rows[rows.length - 1]?.created_at ?? null
    };
}

async function fetchActiveRows(asleepUserId) {
    const result = await pool.query(
        `
        SELECT *
        FROM sleep_stage_events
        WHERE asleep_user_id = $1
          AND session_id IS NULL
        ORDER BY created_at ASC
        `,
        [asleepUserId]
    );

    return result.rows;
}

router.post("/live", async (req, res) => {
    try {
        const {
            asleep_user_id,
            session_id,
            seq_num,
            inference_seq_num,
            sleep_stage
        } = req.body;

        if (!asleep_user_id || sleep_stage === undefined) {
            return res.status(400).json({
                ok: false,
                error: "asleep_user_id and sleep_stage are required"
            });
        }

        console.log("[LiveStage] Received:", req.body);

        const result = await pool.query(
            `
            INSERT INTO sleep_stage_events
                (
                    asleep_user_id,
                    session_id,
                    seq_num,
                    inference_seq_num,
                    sleep_stage
                )
            VALUES ($1, $2, $3, $4, $5)
            RETURNING *
            `,
            [
                asleep_user_id,
                session_id ?? null,
                seq_num ?? null,
                inference_seq_num ?? null,
                sleep_stage
            ]
        );

        const rows = await fetchActiveRows(asleep_user_id);
        const liveReport = buildLiveReport(rows);

        console.log("[LiveStage] Saved:", result.rows[0]);
        console.log("[LiveReport]", liveReport);

        res.json({
            ok: true,
            event: result.rows[0],
            liveReport
        });

    } catch (error) {
        console.error("[LiveStage] Insert failed:", error);

        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

router.post("/finalize", async (req, res) => {
    try {
        const {
            asleep_user_id,
            session_id
        } = req.body;

        if (!asleep_user_id || !session_id) {
            return res.status(400).json({
                ok: false,
                error: "asleep_user_id and session_id are required"
            });
        }

        const result = await pool.query(
            `
            UPDATE sleep_stage_events
            SET session_id = $1
            WHERE asleep_user_id = $2
              AND session_id IS NULL
            RETURNING *
            `,
            [
                session_id,
                asleep_user_id
            ]
        );

        const rowsResult = await pool.query(
            `
            SELECT *
            FROM sleep_stage_events
            WHERE asleep_user_id = $1
              AND session_id = $2
            ORDER BY created_at ASC
            `,
            [
                asleep_user_id,
                session_id
            ]
        );

        const liveReport =
            buildLiveReport(rowsResult.rows, session_id);

        console.log(
            `[LiveStage] Finalized ${result.rowCount} rows for ${asleep_user_id}`
        );

        res.json({
            ok: true,
            updated: result.rowCount,
            liveReport
        });

    } catch (error) {
        console.error("[LiveStage] Finalize failed:", error);

        res.status(500).json({
            ok: false,
            error: error.message
        });
    }
});

module.exports = router;
