//  ReportView.swift - Copyright 2023 Asleep
//

import SwiftUI
import AsleepSDK

struct ReportView: View {
    @Environment(\.presentationMode) private var presentationMode
    let report: Asleep.Model.Report?

    var body: some View {
        VStack {
            HStack {
                Spacer()

                Button {
                    presentationMode.wrappedValue.dismiss()
                } label: {
                    Image(systemName: "xmark.circle.fill")
                }
                .padding(20)
            }

            if let report {
                ScrollView {
                    detailView(report: report)
                        .frame(maxWidth: .infinity)
                }
            }
        }
    }

    @ViewBuilder
    func detailView(report: Asleep.Model.Report) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text(report.session.id)
                .font(.title2.bold())

            Text("Timezone: \(report.timezone)")

            if let endTime = report.session.endTime {
                Text("Time Range: \(report.session.startTime.dateString) ~ \(endTime.dateString)")
            } else {
                Text("Time Range: \(report.session.startTime.dateString)")
            }

            Text("Session State: \(report.session.state.rawValue)")

            stagesView(report: report)
        }
        .padding(.horizontal)
    }

    @ViewBuilder
    func stagesView(report: Asleep.Model.Report) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Sleep Stages")
                .font(.body.bold())
                .padding(.top, 4)

            if let sleepStages = report.session.sleepStages,
               !sleepStages.isEmpty {
                Text("[\(sleepStages.map { String($0) }.joined(separator: ", "))]")
            } else {
                Text("No sleep stage data")
            }

            if let stat = report.stat {
                Text("""
                SleepEfficiency: \(stat.sleepEfficiency?.description ?? "nil")
                SleepLatency: \(stat.sleepLatency?.description ?? "nil")
                WakeupLatency: \(stat.wakeupLatency?.description ?? "nil")
                SleepTime: \(stat.sleepTime?.dateString ?? "nil")
                WakeTime: \(stat.wakeTime?.dateString ?? "nil")
                TimeInWake: \(stat.timeInWake?.description ?? "nil")
                TimeInSleep: \(stat.timeInSleep?.description ?? "nil")
                TimeInBed: \(stat.timeInBed?.description ?? "nil")
                TimeInSleepPeriod: \(stat.timeInSleepPeriod?.description ?? "nil")
                TimeInREM: \(stat.timeInRem?.description ?? "nil")
                TimeInLight: \(stat.timeInLight?.description ?? "nil")
                TimeInDeep: \(stat.timeInDeep?.description ?? "nil")
                WakeRatio: \(stat.wakeRatio?.description ?? "nil")
                SleepRatio: \(stat.sleepRatio?.description ?? "nil")
                RemRatio: \(stat.remRatio?.description ?? "nil")
                LightRatio: \(stat.lightRatio?.description ?? "nil")
                DeepRatio: \(stat.deepRatio?.description ?? "nil")
                """)
            } else {
                Text("Stat is nil")
            }

            Text("Snoring Stages")
                .font(.body.bold())
                .padding(.top, 4)

            if let snoringStages = report.session.snoringStages,
               !snoringStages.isEmpty {
                Text("[\(snoringStages.map { String($0) }.joined(separator: ", "))]")
            } else {
                Text("No snoring stage data")
            }

            if let stat = report.stat {
                Text("""
                TimeInStableBreath: \(stat.timeInStableBreath?.description ?? "nil")
                TimeInUnstableBreath: \(stat.timeInUnstableBreath?.description ?? "nil")
                StableBreathRatio: \(stat.stableBreathRatio?.description ?? "nil")
                UnstableBreathRatio: \(stat.unstableBreathRatio?.description ?? "nil")
                BreathingPattern: \(stat.breathingPattern?.description ?? "nil")
                """)
            }
        }
    }
}
