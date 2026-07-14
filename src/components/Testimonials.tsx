import { useState, useEffect } from 'react';
import { Star, Quote, Loader2 } from 'lucide-react';

interface Testimonial {
  id?: string;
  name: string;
  role: string;
  image: string;
  text: string;
  rating: number;
}

export default function Testimonials() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating] = useState('4.8');
  const [reviewCount] = useState('50,000+');

  useEffect(() => {
    // Shared static testimonials fallback
    const staticTestimonials = [
      {
        name: 'Prem Jv',
        role: 'Student',
        image: '',
        text: 'Excellent Spoken Hindi Centre. Since the Tutor is Ex-Army man, he taught us very practical way of speaking such as Native speaker not only that u will understand culture and high standards of Hindi also. VERY WORTHY',
        rating: 5
      },
      {
        name: 'Mohon',
        role: 'Parent',
        image: '',
        text: 'Excellent teaching methodology, making complex concepts easy to understand. Encourages active participation and provides equal opportunities to all students. Best place for children to learn Hindi very soon.',
        rating: 5
      },
      {
        name: 'Swarnalatha Saravanan',
        role: 'Language Learner',
        image: '',
        text: 'Excellent teaching....such a good understanding of the language... always encouraging....teaches us all the tenses in a simplified form... You have made Hindi language easy to understand and speak.',
        rating: 5
      },
      {
        name: 'Prabhakaran muthusamy',
        role: 'Professional',
        image: '',
        text: 'I have been now completed my 4th week class. I can see a difference in my Hindi proficiency. I can now frame my own sentence with the help of what all I have learnt. This training is purely on your speaking ability.',
        rating: 5
      },
      {
        name: 'Kavitha Kathir',
        role: 'Student',
        image: '',
        text: 'Best method of teaching makes us to understand spoken hindi easily sir..Your army experiences ensure us in hard times. We keep on practicing hindi forever.',
        rating: 5
      },
      {
        name: 'Dharshana',
        role: 'Language Learner',
        image: '',
        text: 'The best place to learn spoken Hindi. The tutor is very kind and friendly. He clarifies all our doubts clearly.',
        rating: 5
      },
      {
        name: 'Santhosh Subramaniam',
        role: 'Professional',
        image: '',
        text: 'Definitely here you will come out learning Spoken Hindi.. I have attended many classes. But here it is entirely different and Mr.Surendar\'s Framework is brilliant.',
        rating: 5
      },
      {
        name: 'Girija Vasumathi',
        role: 'Student',
        image: '',
        text: 'Really vry much satisfied with surendhar sir\'s classes... a vry compact and full packaged content he is giving... Easy to understand and follow it... Also he is positive and motivating.',
        rating: 5
      },
      {
        name: 'visu kavi',
        role: 'Student',
        image: '',
        text: 'Excellent coaching, Everyone easy to understand.',
        rating: 5
      },
      {
        name: 'Ganesan V',
        role: 'Language Learner',
        image: '',
        text: 'Super nice and friendly sir... teaching methodology very easy way to interact with all languages learners... keep moving sir.',
        rating: 5
      }
    ];
    setTestimonials(staticTestimonials);
    setLoading(false);
  }, []);

  // --- Scrolling Logic ---
  const firstRow = testimonials.slice(0, Math.ceil(testimonials.length / 2));
  const secondRow = testimonials.slice(Math.ceil(testimonials.length / 2));

  if (loading) {
    return (
      <section className="py-20 text-center">
        <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto mb-4" />
        <p className="text-xl text-gray-600">Loading testimonials...</p>
      </section>
    );
  }

  const TestimonialCard = ({ testimonial, index }: { testimonial: Testimonial, index: number }) => (
    <div
      key={testimonial.id || index}
      className="bg-white rounded-2xl p-8 shadow-xl hover:shadow-2xl transition-all duration-300 transform relative w-[350px] flex-shrink-0 mx-4"
    >
      <Quote className="absolute top-4 right-4 w-12 h-12 text-orange-200" />
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-orange-200 bg-gray-100 flex-shrink-0">
          {testimonial.image ? (
            <img src={testimonial.image} alt={testimonial.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-orange-500 font-bold text-xl bg-orange-50">
              {testimonial.name.charAt(0)}
            </div>
          )}
        </div>
        <div>
          <h4 className="font-bold text-gray-900 text-lg">{testimonial.name}</h4>
          <p className="text-gray-600 text-sm">{testimonial.role}</p>
        </div>
      </div>
      <div className="flex gap-1 mb-4">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`w-5 h-5 ${i < testimonial.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} />
        ))}
      </div>
      <p className="text-gray-700 leading-relaxed italic line-clamp-4">"{testimonial.text}"</p>
    </div>
  );

  return (
    <section className="py-20 bg-gradient-to-br from-orange-50 via-red-50 to-pink-50 overflow-hidden">
      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        @keyframes marquee-reverse {
          0% { transform: translateX(-50%); }
          100% { transform: translateX(0); }
        }
        .animate-marquee {
          animation: marquee 40s linear infinite;
        }
        .animate-marquee-reverse {
          animation: marquee-reverse 40s linear infinite;
        }
        .pause-on-hover:hover .animate-marquee,
        .pause-on-hover:hover .animate-marquee-reverse {
          animation-play-state: paused;
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
        <div className="text-center" id="testimonials">
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">Student Testimonials</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">Reviews from students of Raanuva Veeran Spoken Hindi Academy</p>
        </div>
      </div>

      {/* Scrolling Rows */}
      <div className="space-y-8 pause-on-hover">
        {/* First Row */}
        <div className="flex overflow-hidden group">
          <div className="flex animate-marquee whitespace-nowrap">
            {[...firstRow, ...firstRow].map((t, i) => (
              <TestimonialCard key={`row1-${i}`} testimonial={t} index={i} />
            ))}
          </div>
        </div>

        {/* Second Row */}
        <div className="flex overflow-hidden group">
          <div className="flex animate-marquee-reverse whitespace-nowrap">
            {[...secondRow, ...secondRow].map((t, i) => (
              <TestimonialCard key={`row2-${i}`} testimonial={t} index={i} />
            ))}
          </div>
        </div>
      </div>

      <div className="mt-16 text-center">
        <div className="inline-flex items-center gap-2 bg-white rounded-full px-6 py-3 shadow-lg">
          <Star className="w-5 h-5 text-yellow-400 fill-current" />
          <span className="font-bold text-gray-900">{averageRating}/5.0</span>
          <span className="text-gray-600">Average Rating</span>
          <span className="text-gray-400">|</span>
          <span className="text-gray-600">{reviewCount} Reviews</span>
        </div>
      </div>
    </section>
  );
}