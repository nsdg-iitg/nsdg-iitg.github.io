---
title: "Memristors and neuromorphic hardware"
short: "Memories"
order: 1
figure: memristor
lead: "Resistive-switching memories from halide perovskites, on glass and on bendable plastic, built into crossbar arrays and artificial synapses for brain-inspired computing."
people: [radharani-yumlembam, ph-nonglen-meitei, himangshu-jyoti-gogoi]
methods: "Spin coating and thermal / e-beam evaporation · conductive AFM · DC and pulsed I–V (Keysight B1500A, Keithley 4200) · DLTS · SPICE (Yakopcic) models · ReRAM peripheral circuits at 180 nm and 65 nm"
description: "Perovskite memristors, flexible ReRAM crossbar arrays and artificial synapses at the Nanoelectronics and Semiconductor Devices Group, IIT Guwahati."
figures:
  - src: "/assets/img/figures/memristor-overview.jpg"
    caption: "Hybrid perovskite memristors: memories, synapses and logic from inorganic, organic and hybrid materials."
  - src: "/assets/img/figures/flexible-memristor-aem2023.jpg"
    caption: "Flexible perovskite memristor on PET, its switching and synaptic plasticity. From M. Patel et al., Adv. Electron. Mater. 9, 2200908 (2023)."
  - src: "/assets/img/figures/flexible-cs3bi2i9-synapse-fpe2025.jpg"
    caption: "A flexible Cs3Bi2I9 memristor acting as a synapse: paired-pulse facilitation, learning and forgetting. From R. Yumlembam et al., Flex. Print. Electron. 10, 015007 (2025)."
  - src: "/assets/img/figures/complementary-switching-aelm2022.jpg"
    caption: "Compliance current selects between two opposite switching modes in a MAPbI3 memristor. From H. J. Gogoi and A. T. Mallajosyula, ACS Appl. Electron. Mater. 4, 1039 (2022)."
---

A memristor is a two-terminal cell whose resistance can be switched between a high and a low state and keeps that state without power. In halide perovskites, mobile ions and vacancies form and break a thin conducting filament between the electrodes. These memories are cheap to make, switch at low voltage, and can be built on flexible substrates. Because their conductance can be tuned in small steps, they can also act like the synapses of a brain.

### Why memristors

A memristor keeps its state without power, shows a pinched hysteresis loop in its I–V curve, and can hold many resistance levels, not only 0 and 1. That allows several bits per cell, computing directly inside the memory, and devices that mimic synaptic weights. Because conductance can be pushed up or down step by step, memristors can show spike-timing-dependent plasticity and Hebbian learning. Switching energies can go down to femtojoules, far below SRAM or DRAM, and the simple two-terminal structure stacks well into dense 3D crossbars.

Uses include non-volatile memory, neuromorphic and in-memory computing, physically unclonable functions (PUFs), analog signal processing and logic-in-memory. Wider directions in the field include 3D memristor arrays (3D RRAM, VRRAM), edge-AI hardware for wearables and IoT, radiation-hard memory for space, and stochastic neuromorphic systems. Our own focus is on crossbar RRAMs made from emerging materials such as perovskites, with high flexibility and endurance.

### What we have shown

- **Lead-free, flexible and air-stable.** Our Cs3Bi2I9 memristors on PET reach an ON/OFF ratio above 10⁵ and run for 10⁴ cycles. They survive more than 30 days in over 80% relative humidity without encapsulation, and bending to a 5 mm radius. A 4×4 flexible crossbar gave 81% yield. The cells learn and forget like synapses at about 0.1 µJ per event.
- **Two switching modes in one cell.** In MAPbI3 memristors, the compliance current selects between a field-driven (redox) mode and a Joule-heating mode of opposite polarity. Together they give complementary resistive switching in a single cell, which helps suppress sneak currents in crossbars.
- **How to measure a memristor properly.** The scan rate, compliance current, pulse settings and device area all change the switching voltages and ON/OFF ratio. We mapped these effects and proposed a standard measurement protocol.
- **The defects behind switching.** DLTS on flexible MAPbI3 memristors finds methylammonium vacancies (activation energy about 0.48 eV) that help the filament form.
- **From device to array.** M.Tech projects have designed read/write peripheral circuits for passive ReRAM crossbars at 180 nm and 65 nm, and studied sneak-path currents and crosstalk.

Ongoing work includes larger crossbar arrays with all-inorganic perovskites, and a memristor-based artificial olfactory (smell) system.
