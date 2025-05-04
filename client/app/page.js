"use client"

import Image from "next/image"
import Link from "next/link"
import Script from "next/script"
import { Globe, MessageSquare, Wallet, BarChart3, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { motion } from "framer-motion"
import dynamic from "next/dynamic"
import { ConnectWallet } from "@/web3"

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const slideIn = {
  initial: { x: -300 },
  animate: { x: 0 },
  exit: { x: -300 }
}

const SplineViewer = dynamic(() => import("@/components/SplineViewer"), {
  ssr: false,
  loading: () => (
    <div className="relative h-[700px] w-[120%] -ml-[10%] overflow-hidden bg-white/5 backdrop-blur-lg rounded-xl animate-pulse" />
  ),
})

export default function Home() {
  return (
    <div className="min-h-screen bg-[#0B0118] text-white overflow-hidden relative font-sans antialiased">
      {/* Background Elements */}
      <div className="absolute inset-0">
        {/* Grid Pattern */}
        <div className="absolute inset-0"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(139, 92, 246, 0.1) 1px, transparent 1px),
              linear-gradient(to bottom, rgba(139, 92, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '60px 60px',
            transform: 'perspective(1000px) rotateX(60deg)',
            transformOrigin: 'center center',
            opacity: 0.5
          }}
        />

        {/* Purple Glow */}
        <div className="absolute inset-0"
          style={{
            background: 'radial-gradient(circle at 50% 50%, rgba(139, 92, 246, 0.15) 0%, transparent 70%)'
          }}
        />
      </div>

      {/* Header */}
      <motion.header
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ type: "spring", damping: 20 }}
        className="relative z-10 px-4 sm:px-6 lg:px-8 py-6 bg-black/10 backdrop-blur-lg border-b border-white/10"
      >
        <div className="flex justify-between items-center max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="flex items-center"
          >
            <span className="text-2xl tracking-tight">
              lucra<span className="font-medium">AI</span>
            </span>
          </motion.div>
          <nav className="hidden md:flex items-center space-x-8">
            <Link href="#features" className="text-white/60 hover:text-white transition-colors text-sm font-light tracking-wide">
              Features
            </Link>
            <Link href="#how-it-works" className="text-white/60 hover:text-white transition-colors text-sm font-light tracking-wide">
              How it Works
            </Link>
            <Link href="#faq" className="text-white/60 hover:text-white transition-colors text-sm font-light tracking-wide">
              FAQ
            </Link>
          </nav>
          <div className="flex items-center space-x-4">
            <motion.div whileHover={{ scale: 1.05 }}>
              <Button variant="ghost" className="text-white/60 hover:text-white text-sm font-light">
                Member Perks
              </Button>
            </motion.div>
            <ConnectWallet />
          </div>
        </div>
      </motion.header>

      {/* Hero Section */}
      <motion.section
        initial="initial"
        animate="animate"
        variants={fadeIn}
        className="relative z-10 px-4 sm:px-6 lg:px-8 py-20 md:py-32"
      >
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center gap-12">
            <div className="md:w-1/2 space-y-6">
              <motion.h1
                variants={fadeIn}
                className="text-4xl md:text-6xl font-light leading-tight tracking-tight"
              >
                Transform Your Wallet with{" "}
                <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-300 font-medium">
                  Lucra AI
                </span>
              </motion.h1>
              <motion.p
                variants={fadeIn}
                className="text-lg text-white/60 font-light tracking-wide leading-relaxed"
              >
                Experience seamless financial management through natural conversations.
                Your AI-powered financial assistant is here.
              </motion.p>
              <motion.div
                variants={fadeIn}
                className="flex flex-col sm:flex-row gap-4 pt-4"
              >
                <Button className="bg-white/10 hover:bg-white/20 text-white border border-white/20 px-8 py-6 text-sm font-medium tracking-wide">
                  Get Started
                </Button>
                <Button variant="outline" className="border-white/20 text-white hover:bg-white/10 px-8 py-6 text-sm font-light tracking-wide">
                  Learn More
                </Button>
              </motion.div>
            </div>
            <div className="md:w-1/2">
              <motion.div
                variants={fadeIn}
                className="relative"
              >
                <SplineViewer />
              </motion.div>
            </div>
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <section id="features" className="relative z-10 px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={fadeIn.initial}
            whileInView={fadeIn.animate}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl md:text-4xl font-light mb-4 tracking-tight">
              Powerful Features for Your <span className="font-medium">Financial Journey</span>
            </h2>
            <p className="text-white/60 max-w-2xl mx-auto font-light tracking-wide leading-relaxed">
              Experience the future of financial management with our AI-powered tools and features.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <MessageSquare className="h-8 w-8 text-purple-400" />,
                title: "Natural Conversations",
                description: "Manage your finances through simple chat interactions.",
              },
              {
                icon: <Wallet className="h-8 w-8 text-purple-400" />,
                title: "Smart Wallet Integration",
                description: "Seamlessly connect and manage multiple wallets.",
              },
              {
                icon: <BarChart3 className="h-8 w-8 text-purple-400" />,
                title: "AI-Powered Insights",
                description: "Get personalized financial insights and recommendations.",
              },
            ].map((feature, index) => (
              <motion.div
                key={index}
                initial={fadeIn.initial}
                whileInView={fadeIn.animate}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05 }}
                className="bg-white/5 backdrop-blur-lg rounded-xl p-6 border border-white/10 hover:border-purple-500/30 transition-all duration-300"
              >
                <div className="bg-purple-900/40 rounded-full w-14 h-14 flex items-center justify-center mb-6">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-medium mb-3 tracking-tight">{feature.title}</h3>
                <p className="text-white/60 font-light tracking-wide leading-relaxed">{feature.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section
        id="how-it-works"
        className="relative z-10 px-4 sm:px-6 lg:px-8 py-20 bg-gradient-to-b from-[#120530]/70 to-[#080215]/70 backdrop-blur-lg"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Experience Effortless Financial Management</h2>
            <p className="text-gray-300 max-w-2xl mx-auto">
              Lucra AI simplifies your financial interactions, allowing you to manage your wallet effortlessly through
              natural conversation. Enjoy increased efficiency and advanced financial oversight, making every
              transaction a breeze.
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center">
            <div className="md:w-1/2 mb-10 md:mb-0">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl blur-xl"></div>
                <div className="relative bg-white/5 backdrop-blur-lg rounded-2xl p-6 border border-white/10 shadow-xl">
                  <Globe className="h-16 w-16 text-purple-400 mx-auto mb-6" />
                  <h3 className="text-2xl font-bold text-center mb-4">Lucra AI&apos;s Smart Wallet Assistant</h3>
                  <p className="text-gray-300 text-center">
                    Lucra AI simplifies your financial interactions, allowing you to manage your wallet effortlessly
                    through natural conversation.
                  </p>
                </div>
              </div>
            </div>
            <div className="md:w-1/2 md:pl-12">
              <div className="space-y-8">
                {[
                  {
                    title: "Natural Language Understanding",
                    description: "Communicate your wallet's needs by chatting naturally",
                  },
                  {
                    title: "AI-Powered Transactions Made Simple",
                    description: "Execute payments and track expenses with precision",
                  },
                  {
                    title: "Comprehensive Wallet Management",
                    description: "Manage your finances efficiently with our smart assistant",
                  },
                ].map((item, index) => (
                  <div key={index} className="flex">
                    <div className="flex-shrink-0 h-12 w-12 bg-purple-900/40 rounded-full flex items-center justify-center mr-4">
                      <span className="text-xl font-bold text-purple-400">{index + 1}</span>
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold mb-2">{item.title}</h4>
                      <p className="text-gray-400">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonial Section */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <div className="bg-white/3 backdrop-blur-lg rounded-xl p-8 border border-white/5">
            <div className="mb-6">
              <Image
                src="/placeholder.svg?height=80&width=80"
                alt="User Avatar"
                width={80}
                height={80}
                className="rounded-full mx-auto"
              />
            </div>
            <blockquote className="text-2xl font-light italic mb-6">
              &ldquo;Lucra AI has transformed the way I manage my finances. It&apos;s like having a personal CFO at my fingertips!&rdquo;
            </blockquote>
            <div className="font-medium">
              <p className="text-white">Emily Johnson</p>
              <p className="text-gray-400">Finance Manager, TechCorp</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section
        id="faq"
        className="relative z-10 px-4 sm:px-6 lg:px-8 py-20 bg-gradient-to-b from-[#120530]/70 to-[#080215]/70 backdrop-blur-lg"
      >
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">FAQs</h2>
            <p className="text-gray-300">Find answers to your questions about Lucra AI and its features.</p>
          </div>

          <Accordion type="single" collapsible className="space-y-4">
            {[
              {
                question: "What is Lucra AI?",
                answer:
                  "Lucra AI is an AI-powered assistant designed to manage your day-to-day finances. It allows you to interact with your wallet naturally, like having a personal CFO, simplifying transactions and tracking.",
              },
              {
                question: "How does it work?",
                answer:
                  "Lucra AI uses advanced AI to understand your commands and execute transactions. You can send, split, and track your finances through simple conversations. It makes managing your wallet intuitive and efficient.",
              },
              {
                question: "Is it secure?",
                answer:
                  "Yes, security is a top priority for Lucra AI. It employs robust encryption and security protocols to protect your data and transactions. You can use it with confidence knowing your information is safe.",
              },
              {
                question: "Can I customize it?",
                answer:
                  "Lucra AI offers customizable settings to tailor your experience. You can adjust preferences for notifications and transaction types. This flexibility ensures that it meets your unique financial needs.",
              },
              {
                question: "What platforms support it?",
                answer:
                  "Lucra AI is compatible with various blockchain platforms. It seamlessly integrates with popular wallets to enhance your financial management. Check our website for a list of supported platforms.",
              },
            ].map((faq, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white/3 backdrop-blur-lg rounded-xl border border-white/5"
              >
                <AccordionTrigger className="px-6 py-4 text-left font-medium text-lg hover:no-underline">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="px-6 pb-4 text-gray-300">{faq.answer}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          <div className="text-center mt-12">
            <h3 className="text-xl font-semibold mb-4">Still have questions?</h3>
            <p className="text-gray-300 mb-6">We&apos;re here to help with any inquiries.</p>
            <Button className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8">
              Contact
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-5xl mx-auto">
          <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 backdrop-blur-lg rounded-xl p-8 md:p-12 border border-white/5 shadow-xl">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="md:w-2/3 mb-8 md:mb-0">
                <h2 className="text-3xl md:text-4xl font-bold mb-4">Transform Your Financial Experience</h2>
                <p className="text-gray-300">
                  Join Lucra AI today and simplify your financial management with just a conversation.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
                <Button className="bg-white text-purple-900 hover:bg-gray-100 px-8 py-6">Sign Up</Button>
                <Button variant="outline" className="border-white text-white hover:bg-white/10 px-8 py-6">
                  Learn More
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-4 sm:px-6 lg:px-8 py-12 bg-black/20 backdrop-blur-lg border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
            <div className="col-span-2">
              <h3 className="text-xl font-bold mb-4">Stay Connected</h3>
              <p className="text-white/60 mb-6">
                Your AI-powered financial assistant, available 24/7.
              </p>
              <div className="flex space-x-4">
                {["facebook", "twitter", "instagram", "linkedin"].map((social) => (
                  <a
                    key={social}
                    href="#"
                    className="h-10 w-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-white/20 transition-colors"
                  >
                    <span className="sr-only">{social}</span>
                    <span className="text-white/60">{social[0].toUpperCase()}</span>
                  </a>
                ))}
              </div>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2">
                {["About", "Features", "Pricing", "Contact"].map((link) => (
                  <li key={link}>
                    <Link href="#" className="text-white/60 hover:text-white transition-colors">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Resources</h4>
              <ul className="space-y-2">
                {["Blog", "Help Center", "FAQs", "Community"].map((link) => (
                  <li key={link}>
                    <Link href="#" className="text-white/60 hover:text-white transition-colors">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2">
                {["Terms", "Privacy", "Security"].map((link) => (
                  <li key={link}>
                    <Link href="#" className="text-white/60 hover:text-white transition-colors">
                      {link}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-white/10 flex flex-col md:flex-row justify-between items-center">
            <p className="text-white/60">© 2024 Lucra AI. All rights reserved.</p>
            <div className="mt-4 md:mt-0">
              <Image src="/placeholder.svg?height=40&width=120" alt="Payment Methods" width={120} height={40} />
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
